'use strict';
const domains = require('./domain.json');
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
  if (!isValidUrl(url)) {
    // TODO 4xxエラーで返却する(無効なURL形式)
  }
  if (!isEnabledDomain(url)) {
    // TODO 4xxエラーで返却する(無許可のドメイン)
  }
  sequence((id) => {
    dynamo.put({TableName: 'shorturl', Item: {
      id: String(id),
      long_url: event.queryStringParameters.longUrl
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
  dynamo.update(params, function(err, data) {
    let id;
    if (err) {
      console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
    } else {
      console.log('UpdateItem succeeded:', JSON.stringify(data, null, 2));
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
  try {
    new URL(url);
  } catch(e) {
    return false;
  }
  return true;
}

/**
 * ドメインリストに含まれているURLか判定します。
 * @param {string} url URL文字列
 */
function isEnabledDomain(url) {
  if (domains.length === 0) {
    return true;
  }
  const urlA = new URL(url);
  for (const domain of domains) {
    const urlB = new URL(domain);
    if (urlA.host === urlB.host) {
      return true;
    }
  }
  return false;
}
