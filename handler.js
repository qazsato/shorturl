'use strict';
const domains = require('./domain.json');
const URL = require('url');
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

/**
 * 短縮URLをオリジナルに復元しリダイレクトします。
 * @param {*} event
 * @param {*} context
 * @param {*} callback
 */
module.exports.short2long = (event, context, callback) => {
  const params = {
    TableName: 'shorturl',
    KeyConditionExpression: '#id = :id',
    ExpressionAttributeNames: {
      '#id': 'id'
    },
    ExpressionAttributeValues: {
      ':id': event.pathParameters.id
    }
  };
  dynamo.query(params, (err, data) => {
    if (err) {
      callback(err);
    } else {
      const response = {
        statusCode: 302,
        headers: {
          'Location': data.Items[0].long_url
        }
      };
      return callback(null, response);
    }
  });
};

/**
 * 短縮URLを発行します。
 * @param {*} event
 * @param {*} context
 * @param {*} callback
 */
module.exports.long2short = (event, context, callback) => {
  const url = event.queryStringParameters.longUrl;
  if (!isValidUrl(url) || !isEnabledDomain(url)) {
    const response = {
      statusCode: 400,
      body: JSON.stringify({message: 'Bad Request'})
    };
    callback(null, response);
    return;
  }
  sequence((id) => {
    dynamo.put({TableName: 'shorturl', Item: {
      id: String(id),
      long_url: url
    }}, callback);
  });
};

/**
 * シーケンス(通し番号)を発行します。
 * @param {function} callback
 */
function sequence(callback) {
  const params = {
    TableName: 'shorturl_sequence',
    Key: {
      name: 'shorturl'
    },
    UpdateExpression: 'set current_number = current_number + :val',
    ExpressionAttributeValues: {
      ':val': 1
    },
    ReturnValues: 'UPDATED_NEW'
  };
  dynamo.update(params, (err, data) => {
    let id;
    if (!err) {
      id = data.Attributes.current_number;
    }
    callback(id);
  });
}

/**
 * 適切なURLの形式か判定します。
 * @param {string} url URL文字列
 */
function isValidUrl(url) {
  if (URL.parse(url).host) {
    return true;
  }
  return false;
}

/**
 * ドメインリストに含まれているURLか判定します。
 * @param {string} url URL文字列
 */
function isEnabledDomain(url) {
  if (domains.length === 0) {
    return true;
  }
  const urlA = URL.parse(url);
  for (const domain of domains) {
    const urlB = URL.parse(domain);
    if (urlA.host === urlB.host) {
      return true;
    }
  }
  return false;
}
