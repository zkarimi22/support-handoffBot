const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const request = require('request');
// const config = require('./config');

const CONNECTION_URI = process.env.MONGODB_URI;
const mongoose = require('mongoose');
const hqroutes = express.Router();
const PORT = process.env.PORT;
const {
    WebClient,
    retryPolicies
} = require('@slack/web-api');

// An access token (from your Slack app or custom integration - xoxp, xoxb)
const token = process.env.SLACK_TOKEN;
const hqtoken = process.env.HQ_SLACK;




const web = new WebClient(token);

const hqweb = new WebClient(hqtoken);



let HandOff = require('./q4_handoffmodel');




app.use(cors());
app.options('https://birdsirl.herokuapp.com/', cors());


app.use(bodyParser.json());



mongoose.connect(CONNECTION_URI, {
    useNewUrlParser: true
});
const connection = mongoose.connection;

connection.once('open', function() {

    console.log(' connection  ');
});



hqroutes.route('/').post(function(req, res) {

    var payload = req.body;

    res.status(200).send("Welcome to the club!");

    console.log(payload);

    if (payload.event.type === "message") {
        let response_text;
        if (payload.event.text.includes("user")) {


            // user= @Greg| ticket=https://q4websystems.zendesk.com/agent/tickets/273313 | issue=Left a few items in progress |  solution= Please be sure to place all items for approval|

            var textSplit = payload.event.text.split("|");

            var regardingUser = textSplit[0].split("=")[1].replace(/</g, "").replace(/>/g, "");

            var ticket = textSplit[1].split("=")[1].replace(/</g, "").replace(/>/g, "");

            var issue = textSplit[2].split("=")[1];

            var solution = textSplit[3].split("=")[1];




            // send the handoff 
            var sendingUser = payload.event.user;




            const conversationId = regardingUser.replace(/ /g, '');

            (async () => {

                var response_text = "Hey 👋 Please review this handoff for next time. Thanks in advance! \n\n Ticket= " + ticket + "\nIssue= " + issue + "\nPossible Solution= " + solution;
                // See: https://api.slack.com/methods/chat.postMessage
                const res = await web.chat.postMessage({
                    channel: conversationId,
                    text: response_text
                });

                // `res` contains information about the posted message




            })();



            (async () => {
                // See: https://api.slack.com/methods/chat.postMessage
                const res = await hqweb.users.info({
                    user: sendingUser
                });

                // `res` contains information about the posted message
                console.log(res.user.real_name);

                sendingUser = res.user.real_name;



            })();

            (async () => {
                // See: https://api.slack.com/methods/chat.postMessage
                var formatRegardingUser = regardingUser.replace(/@/g, '').replace(/ /g, '');;

                console.log(formatRegardingUser);

                const res = await hqweb.users.info({
                    user: formatRegardingUser
                });

                // `res` contains information about the posted message
                console.log(res.user.real_name);

                regardingUser = res.user.real_name;

                var timestamp = new Date();

                console.log('bre');
                console.log(ticket, issue, solution, regardingUser, sendingUser, timestamp);

                timestamp = timestamp.toString();

                const handy = new HandOff({
                    ticket,
                    issue,
                    solution,
                    regardingUser,
                    sendingUser,
                    timestamp
                });
                handy.save(function(err) {
                    if (err) {
                        console.log("Error registering new HandOff please try again.");
                    } else {}
                });

            })();



            // send confirmation to the initial user 


            (async () => {

                var response_text = "✔️ Confirmed that this note has been sent.";
                // See: https://api.slack.com/methods/chat.postMessage
                const res = await web.chat.postMessage({
                    channel: sendingUser,
                    text: response_text
                });

                // `res` contains information about the posted message 

            })();


        } else if (payload.event.text.includes("welcome=")) {



            var introSplit = payload.event.text.split("=");

            var introregardingUser = introSplit[1].replace(/</g, "").replace(/>/g, "");


            var formatUser = introregardingUser.replace(/@/g, '').replace(/ /g, '');

            console.log(formatUser);


            (async () => {

                var response_text = "👋 Welcome to HandoffBot! \n \nSend a message to me with the format below to send a gentle reminder to a colleague about any handoff concerns. \n\nNote: To get reminded of the below format, type help for a quick prompt anytime! Format: \n\nuser= @ USER | ticket=FULL_URL | issue=BRIEF_ISSUE |  solution=SOLUTION_HERE |\n";
                // See: https://api.slack.com/methods/chat.postMessage
                const res = await web.chat.postMessage({
                    channel: formatUser,
                    text: response_text
                });

                // `res` contains information about the posted message 

            })();


        } else {

            var sendingUser = payload.event.user;



            (async () => {

                var response_text = "😔 I'm sorry... That didn't work. Be sure to include the | splitters and format as follows: \n\nuser= @ USER | ticket=FULL_URL | issue=BRIEF_ISSUE |  solution=SOLUTION_HERE |\n";
                // See: https://api.slack.com/methods/chat.postMessage
                const res = await web.chat.postMessage({
                    channel: sendingUser,
                    text: response_text
                });

                // `res` contains information about the posted message 

            })();


        }
    }




});


hqroutes.route('/add').post(function(req, res) {

    const {
        ticket,
        issue,
        resolution,
        person,
        timestamp
    } = req.body;
    const handy = new HandOff({
        ticket,
        issue,
        resolution,
        person,
        timestamp
    });
    handy.save(function(err) {
        if (err) {
            res.status(500)
                .send("Error registering new HandOff please try again.");
        } else {
            res.status(200).send("Welcome to the club!");
        }
    });
});

hqroutes.route('/feed/:tokenId').get(function(req, res) {

    if (req.params.tokenId === process.env.handoffToken) {


        HandOff.find(function(err, handoffs) {

            if (err) {
                console.log('err');
            } else {
                res.json(handoffs);



            }
        }).sort({
            date: -1
        });

    } else {
        res.status(401);
    }
});




app.use('/api', hqroutes);

app.listen(PORT, function() {
    console.log("Server is running on Port:" + PORT);
});