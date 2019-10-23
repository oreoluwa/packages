'use strict';

const iconv = require('iconv-lite');
const {
  URL
} = require('url');
const qs = require('querystring');
const asyncifyStream = require('@oreoluwa/asyncifystream');

const urlEncode = (str) => {
  const encoded = Buffer.from(str).toString('base64')
  return encoded.replace('+', '-').replace('/', '_').replace(/=+$/, '');
};

const title = 'Track Mail Views Plugin';

const init = (app, done) => {
  const linksProto = app.config.pixelProto || 'https';
  const linksHost = app.config.pixelHost;
  const linksPath = app.config.pixelPath;
  const linkTemplate = app.config.pixelUrlTemplate;

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
      if (( linksHost || linkTemplate ) && node.contentType === 'text/html') {
        let pixelUrl;

        const replacements = {
          envelopeId: envelope.id,
          recipientId: urlEncode(envelope.to[0]),
        };

        if (linkTemplate) {
          Object.keys(replacements).forEach(key => {
            pixelUrl = (pixelUrl || linkTemplate).replace(`{${key}}`, replacements[key]);
          });
        } else {
          const url = new URL(linksPath, `${linksProto}://${linksHost}`);
          url.search = qs.stringify(replacements);
          pixelUrl = url.href;
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
