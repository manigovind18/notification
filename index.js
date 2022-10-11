var AWS = require('aws-sdk');
var mustach = require('mustache');
var s3 = new AWS.S3();
var s3links = "";
exports.handler = (event) => {
    
    console.log(event);
    var interfacedetails = JSON.parse(event.Records[0].body);
    var interfacename = interfacedetails.interfacename;
    var interfacesubject = interfacedetails.subject;
    var interfaceparameters = interfacedetails.parameters;
    console.log(interfacedetails.s3links);
    if(interfacedetails.s3links){
        var attachmenttemplate = "{{#s3links}} {{{.}}} , {{/s3links}} ";
        s3links = mustach.render(attachmenttemplate, interfacedetails).replaceAll("s3://","https://ima.pizer.com/report/");
        
    }
    var params = { Bucket: 'notification-bucket18/'+interfacename, Key: 'config.json' }
    var request = s3.getObject(params)
    
    request.createReadStream().on('data', function(data) {
        console.log("Got data:", data.toString());
        var configuration = JSON.parse(data.toString());
        var business_mailtemplate = configuration.mailtemplates.business;
        var business_topic = configuration.business_snstopic;
        

        params = { Bucket: 'notification-bucket18/'+interfacename, Key: business_mailtemplate };
        var templaterequest = s3.getObject(params);
        templaterequest.createReadStream().on('data', function(template) {
            
            
            

            var renderedtext = mustach.render(template.toString(), interfaceparameters);
            renderedtext = renderedtext + s3links;
            console.log(renderedtext);
            var topic_params = {
                Message: renderedtext,
                Subject: interfacesubject,
                MessageAttributes : {
                    "interfacenames" :{DataType : 'String',StringValue:interfacename } 
                },
                /* required */
                TopicArn: "arn:aws:sns:us-east-1:544660453886:"+business_topic
            };
            console.log(topic_params);
            // Create promise and SNS service object
            var publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' }).publish(topic_params).promise();

            // Handle promise's fulfilled/rejected states
            publishTextPromise.then(
                function(data) {
                    
                    console.log("MessageID is " + data.MessageId);
                }).catch(
                function(err) {
                    console.error(err, err.stack);
                });
        });
    });
};
