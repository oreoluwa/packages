'use strict';

const iconv = require('iconv-lite');
const {
  URL
} = require('url');

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
};

const title = 'Track Mail Views Plugin';

const init = (app, done) => {
  const linksProto = app.config.pixelProto || 'https';
  const linksHost = app.config.pixelHost;
  const linksPath = app.config.pixelPath;

  app.addRewriteHook(
    (envelope, node) => ['text/html'].includes(node.contentType),
    async (envelope, node, decoder, encoder) => {
      let html = await asyncifyStream(decoder);

      if (node.charset) {
        html = iconv.decode(html, node.charset);
      } else {
        html = html.toString('binary');
      }
      node.setCharset('utf-8');

      let updatedMail = html;
      if (linksHost && node.contentType === 'text/html') {

        const pixelUrl = new URL(linksPath, `${linksProto}://${linksHost}`);
        const altText = "Tracking view";
        let pixelLink = `<img src="${pixelUrl.href}" title="${altText}" />`;

        if (/<\/body\b/i.test(updatedMail)) {
          updatedMail.replace(/<\/body\b/i, match => '\r\n' + pixelLink + '\r\n' + match);
        } else {
          updatedMail += '\r\n' + pixelLink;
        };
      };

      encoder.end(Buffer.from(updatedMail));
    }
  );
  done();
};

module.exports = {
  title,
  init,
};
