'use strict';

const {
  URL
} = require('url');
const qs = require('querystring');
const asyncifyStream = require('@oreoluwa/asyncifystream');
const cheerio = require('cheerio');
const PassThrough = require('stream').PassThrough;

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
    (envelope, node) => ['text/html'].includes(node.contentType),
    async (envelope, node, decoder, encoder) => {
      const isHtml = node.contentType === 'text/html';
      const isPlainText = node.contentType === 'text/plain';

      let html = await asyncifyStream(decoder, node.charset);
      html = html.replace('ahref', 'a href');
      const $ = cheerio.load(html);

      node.setCharset('utf-8');

      if ( linksHost || linkTemplate ) {
        if (isHtml) {
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
          $('body').prepend(pixelImage);
        }
      };

      const bufferStream = new PassThrough();
      // Write to buffer
      bufferStream.end(Buffer.from($.html(), node.charset || 'utf-8'));
      // Pipe to encoder stream
      bufferStream.pipe(encoder);
    }
  );
  done();
};

module.exports = {
  title,
  init,
};
