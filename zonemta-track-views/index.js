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
  const linkTemplate = app.config.pixelUrlTemplate;

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
        let pixelUrl;

        if (linkTemplate) {
          const replacements = {
            envelopeId: envelope.id,
            recipientId: ennvelope.to[0],
          };

          Object.keys(replacements).forEach(key => {
            pixelUrl = linkTemplate.replace(`{${key}}`, replacements[key]);
          });
        } else {
          pixelUrl = new URL(linksPath, `${linksProto}://${linksHost}`);
        }

        let pixelImage = `<img class="link-tracking-open" alt="Open Tracking" width="0" height="0" style="border:0; width:0; height:0;" src="${pixelUrl}">`

        if (/<\/body\b/i.test(updatedMail)) {
          updatedMail.replace(/<\/body\b/i, match => '\r\n' + pixelImage + '\r\n' + match);
        } else {
          updatedMail += '\r\n' + pixelImage;
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
