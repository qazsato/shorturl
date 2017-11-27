'use strict';
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports.long2short = (event, context, callback) => {
  const longUrl = event.queryStringParameters.longUrl;
  dynamo.put({TableName: 'shorturl', Item: {
    id: '1',
    long_url: longUrl
  }}, callback);
};
