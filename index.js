var restify = require('restify');
var logger = require('morgan');
var sqlite3 = require('sqlite3').verbose();
var request = require('request');

var VERIFY_TOKEN = process.env.VERIFICATION_TOKEN || 'stuff';

// The open port is linked to the port opened
var PORT = process.env.PORT || 8081

var server = restify.createServer()

const databaseFile = './attendance_log.db';

// Log via terminal the requests the server receives
server.use(logger('tiny'))

function query_db(query, callback) {
	let db = new sqlite3.Database(databaseFile, sqlite3.OPEN_READONLY, (err) => {
		if (err) {
			console.error(err.message);
		}
		console.log('Connected to database');
	});

	let sql = 'select * from checkins LIMIT 1';
	db.all(sql, [], (err, rows) => {
		if (err) {
			throw err;
		}
		// The rows / results of the query are essentially returned or at
		// least handed over here. 
		callback(rows);
	});

	db.close((err) => {
		if (err) {
			console.error(err.message);
		}
		console.log('Closed database');
	});
}

// Request URL. We choose how to handle it here
server.post('/', restify.plugins.bodyParser({mapParams: true}), function (req, res) {
	/*
	 * A slash command for '/weather' will return something similar to
	 * the following for the req.params
	 *
	 * token=gIkuvaNzQIHg97ATvDxqgjtO
	 * team_id=T0001
	 * team_domain=example
	 * enterprise_id=E0001
	 * enterprise_name=Globular%20Construct%20Inc
	 * channel_id=C2147483705
	 * channel_name=test
	 * user_id=U2147483697
	 * user_name=Steve
	 * command=/weather
	 * text=94070
	 * response_url=https://hooks.slack.com/commands/1234/5678
	 * trigger_id=13345224609.738474920.8088930838d88f008e0
	 *
	 * Note that user_name is being phase out
	 */

	// Upon receiving a request, we should verify it's coming from Slack
  if (req.params.token !== VERIFY_TOKEN) {
		console.log("verification failed");
		console.log(req.params);
		
		// We can choose to disable verification until we get env variables figured 
		// out return res.send(401, 'Unauthorized')
  } else {
		console.log("verification succ");
		console.log(req.params);
	}

	//if (req.params.ssl_check == '1') {
		//console.log('Got an SSL check');
		//res.send(200, 'OK');
	//}

	// Formulate the message
  var message = 'Message Received Succ';

  // Handle any help requests
  if (req.params.text === 'help') {
    message = "Sorry, I can't offer much help, just here to beep and boop"
  }

	// Immediately respond
	res.send({
		response_type: 'in_channel',
		text: "Hmm, I'm thinking." 
	});

	console.log(req.params.response_url);
	query_db("random query", function(rows) {
		console.log('req started');

		slack_data = {'text': 'Hello!'}
		response = request.post({
			uri: req.params.response_url,
			headers: {'Content-Type': 'application/json'},
			body: slack_data,
			json: true,
		});
		console.log(response);
		console.log('req finished');
		//res.send({
			//response_type: 'in_channel',
			//text: "stuff" 
		//});
	});
})
// Add a GET handler for `/beepboop` route that Slack expects to be present
server.get('/beepboop', function (req, res) {
  res.send(200, 'Ok')
})

// Add a GET handler for the default landing route 
server.get('/', function(req, res) {
	res.send(200, 'Server is online');
})

// 🔥 it up
server.listen(PORT, function (err) {
  if (err) {
    return console.error('Error starting server: ', err)
  }

  console.log('Server successfully started on port %s', PORT)
});

