var mows     = require("mows");

var server = mows.createServer(function(client){
var self = this;

  if (!self.clients) self.clients = {};

  client.on('connect', function(packet) {
    client.connack({returnCode: 0});
    client.id = packet.clientId;
    self.clients[client.id] = client;
    client.subscriptions = [];
  });

  client.on('publish', function(packet) {

  	var validation = function(client, topic)
  	{
  		return client.subscriptions.some(function(reg){
  			return reg.test(topic);
  		});
  	}

    for (var k in self.clients) {
    	if(validation(clients[k],packet.topic))
      		self.clients[k].publish({topic: packet.topic, payload: packet.payload});
    }
  });

  client.on('subscribe', function(packet) {
    var granted = [];
    for (var i = 0; i < packet.subscriptions.length; i++) {
    	var qos = packet.subscriptions[i].qos
        	, topic = packet.subscriptions[i].topic
        	, reg = new RegExp(topic.replace('+', '[^\/]+').replace('#', '.+').replace("*","\S*") + '$');
      	granted.push(packet.subscriptions[i].qos);
      	client.subscriptions.push(reg);
    }

    client.suback({granted: granted, messageId: packet.messageId});
  });

  client.on('pingreq', function(packet) {
    client.pingresp();
  });

  client.on('disconnect', function(packet) {
    client.stream.end();
  });

  client.on('close', function(err) {
    delete self.clients[client.id];
  });

  client.on('error', function(err) {
    client.stream.end();
    console.log('error!');
  });
});

server.listen(12345);

//////////////////////////////////////////////////////////
var client   = mows.createClient("ws://localhost:12345");
client.subscribe("/a/b/c/+");
client.publish("/a/b/c/presence","Hello mqtt");

var callback_message = function (topic, message)
{
	console.log("TOPIC:",topic, "MESSAGE:",message);
}

client.on("message", callback_message);