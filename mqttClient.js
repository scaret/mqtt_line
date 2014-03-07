var mqtt     = require("mqtt");
var client = mqtt.createClient();
client.on("connect", function(){
	client.publish("Hello, world!", "from mqtt client");
	process.exit();
})