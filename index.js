var restify = require('restify');
var logger = require('morgan');
var sqlite3 = require('sqlite3').verbose();
var request = require('request');

var VERIFY_TOKEN = process.env.VERIFICATION_TOKEN || 'missing token';

// The open port is linked to the port opened
var PORT = process.env.PORT || 8081

var server = restify.createServer()

const databaseFile = './attendance_log.db';

// Log via terminal the requests the server receives
server.use(logger('tiny'))

// Search the database with an sql QUERY
// Execute the callback upon completion of the query
function query_db(query, callback) {
	let db = new sqlite3.Database(databaseFile, sqlite3.OPEN_READONLY, (err) => {
		if (err) {
			console.error(err.message);
			callback("Error opening database", null);
		}
	});

	db.all(query, [], callback);

	db.close((err) => {
		if (err) { 
			console.error(err.message); 
			callback("Error closing database", null);
		}
	});
}

// Send a POST HTTP request to respond to slash command
function sendDelayedResponse(req, message) {
	url = req.params.response_url;
	query = " > " + req.params.text + "\n";
	slack_data = {
		'text': query + message,
		'response_type': 'in_channel',
	}
	response = request.post({
		uri: url,
		headers: {'Content-Type': 'application/json'},
		body: slack_data,
		json: true,
	});
}

// Parse database rows into a readable string
function stringify_rows(rows) {
	result = ""

	// List out the column names
	if (rows && rows.length > 0) {
		result = Object.keys(rows[0]).join("\t") + "\n";
	}

	rows.forEach(row => {
		for (var key in row) {
			result += row[key] + "\t";
		}
		result += "\n";
	});
	return result;
}

// Respond to HTTP requests triggered by slash commands
server.post('/', restify.plugins.bodyParser({mapParams: true}), function (req, res) {

	// Upon receiving a request, we should verify it's coming from Slack
  if (req.params.token !== VERIFY_TOKEN) {
		console.log("verification failed");
		return res.send(401, 'Unauthorized');
  }

  // Handle any help requests
  if (!req.params.text || req.params.text === 'help') {
    message = "Enter a sql statement to query the staff checkin database";
		res.send({
			response_type: 'ephemeral',
			text: message
		});
		return;
  }

	query = req.params.text;

	// Give feedback to the user that we've received the command
	res.send({
		response_type: 'ephemeral',
		text: "Hmm, I'm thinking." 
	});

	query_db(query, function(err, rows) {
		if (err) {
			sendDelayedResponse(req, err.code);
		} else {
			console.log('Obtained rows');
			sendDelayedResponse(req, stringify_rows(rows));
		}
	});
})

// Add a GET handler for the default landing route 
server.get('/', function(req, res) {
	res.send(200, 'Server is online');
})

// Fire up the server
server.listen(PORT, function (err) {
  if (err) {
    return console.error('Error starting server: ', err)
  }

  console.log('Server successfully started on port %s', PORT)
});

