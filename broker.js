var mows     = require("mows");
var mqtt     = require("mqtt");

// callback for all the servers. They should work exactly the same
var callback_createServer = function (client)
{
    var self = this;
    if (!self.clients) self.clients = {};

    //.........................................................
    var callback_connect = function (packet)
    {
        var client = this;
        client.connack({returnCode: 0});
        //trust the client and accept the clientId
        client.id = packet.clientId;
        self.clients[client.id] = client;
        client.subscriptions = [];
    };
    //.........................................................
    var callback_subscribe = function (packet)
    {
        var granted = [];
        for (var i = 0; i < packet.subscriptions.length; i++) {
            var qos   = packet.subscriptions[i].qos;
            var topic = packet.subscriptions[i].topic;
            //from MQTT rule to JavaScript regexp
            // needs further config later.
            var reg   = new RegExp(topic.replace('+', '[^\/]+').replace('#', '.+').replace("*","\S*") + '$');
            granted.push(packet.subscriptions[i].qos);
            client.subscriptions.push(reg);
        }
        client.suback({granted: granted, messageId: packet.messageId});
    };
    //.........................................................
    var callback_publish = function (packet)
    {
        var validation = function(client, topic)
        {
            return client.subscriptions.some(function(reg){
                return reg.test(topic);
            });
        }
        ///////////////////////////////////////////////////////
        for (var k in self.clients)
        {
            var the_client = clients[k];
            if (validation(the_client, packet.topic))
            {
                the_client.publish({topic: packet.topic, payload: packet.payload});
            }
        }
    };

    ///////////////////////////////////////////////////////////
    client.on('connect', callback_connect);
    client.on('subscribe', callback_subscribe);
    client.on('publish', callback_publish);


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
}

///////////////////////////////////////////////////////////////////////////////////////
// creates the mqtt websocket server
var server = mows.createServer(callback_createServer);
server.listen(8080);

// create the mqtt server
var mqttServer = mqtt.createServer(callback_createServer);
server.listen(1883);

///////////////////////////////////////////////////////////////////////////////////////
// For debug, create a client, listen to all topics, and log all the message
var client   = mows.createClient("ws://localhost:8080");
client.subscribe("+");

//.................................................
var callback_message = function (topic, message)
{
	console.log("TOPIC:",topic, "MESSAGE:",message);
}
///////////////////////////////////////////////////
client.on("message", callback_message);