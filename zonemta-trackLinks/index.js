'use strict';

const iconv = require('iconv-lite');
const urlRegex = require('url-regex');
const { URL } = require('url');

const asyncifyStream = (decoder) => {
  return new Promise((resolve, reject) => {
    let chunks = [];
    let chunklen = 0;
    decoder.on('data', chunk => {
      chunks.push(chunk);
      chunklen += chunk.length;
    });

    decoder.on('end', () => {
      const html = Buffer.concat(chunks, chunklen);
      resolve(html);
    });
  });
}

const urlEncode = (str) => {
  const encoded = Buffer.from(str).toString('base64')
  return encoded.replace('+', '-').replace('/', '_').replace(/=+$/, '');
};

const urlDecode = (encoded) => {
  sanitizedEncoded = encoded.replace('-', '+').replace('_', '/');
  while (sanitizedEncoded.length % 4)
    sanitizedEncoded += '=';
  return Buffer.from(sanitizedEncoded, 'base64').toString('utf8');
};

const title = 'Track Mail Links Plugin';

const init = (app, done) => {
  const linksProto = app.config.trackingProto || 'https';
  const linksHost = app.config.trackingHost;
  const linksPath = app.config.trackingPath;
  const linksQuery = app.config.trackingQuery || 'link';

  app.addRewriteHook(
    (envelope, node) => ['text/html', 'text/plain'].includes(node.contentType),
    async (envelope, node, decoder, encoder) => {
      let html = await asyncifyStream(decoder);

      if (node.charset) {
        html = iconv.decode(html, node.charset);
      } else {
        html = html.toString('binary');
      }
      node.setCharset('utf-8');

      let updatedMail = html;
      if (linksHost) {
        const url = new URL(linksPath, `${linksProto}://${linksHost}`);
        updatedMail = html.replace(urlRegex({strict: false}), function(link) {
          url.search = [linksQuery, urlEncode(link) ].join('=');

          return url.href;
        });
      }

      encoder.end(Buffer.from(updatedMail));
    }
  );

  done();
};

module.exports = {
  title,
  init,
};
