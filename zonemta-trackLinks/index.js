'use strict';

const iconv = require('iconv-lite');
const { URL } = require('url');
const qs = require('querystring');

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

// https://ctrlq.org/code/20294-regex-extract-links-javascript
const updateLinksInHTML = (html, manipulate) => {
  const regex = /href\s*=\s*(['"])(https?:\/\/.+?)\1/ig;
  let link;

  while((link = regex.exec(html)) !== null) {
    html = html.replace(link[2], manipulate(link[2]));
  }

  return html;
}

const createTextLinks = (text) => (text || "").replace(
    /([^\S]|^)(((https?\:\/\/)|(www\.))(\S+))/gi,
    (match, space, url) => {
      let hyperlink = url;
      if (!hyperlink.match('^https?:\/\/')) {
        hyperlink = 'http://' + hyperlink;
      }
      return space + '<a href="' + hyperlink + '">' + url + '</a>';
    }
  );

const title = 'Track Mail Links Plugin';

const init = (app, done) => {
  const linksProto = app.config.trackingProto || 'https';
  const linksHost = app.config.trackingHost;
  const linksPath = app.config.trackingPath;
  const linksQuery = app.config.trackingQuery || 'link';
  const linkTemplate = app.config.trackingLinkTemplate;

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
      if (linksHost || linkTemplate) {

        updatedMail = createTextLinks(html);
        updatedMail = updateLinksInHTML(updatedMail, (text) => {
          const encodedLink= urlEncode(text);

          const replacements = {
            envelopeId: envelope.id,
            recipientId: urlEncode(envelope.to[0]),
            encodedLink,
          };

          let linksUrl;
          if (linkTemplate) {
            Object.keys(replacements).forEach(key => {
              linksUrl = (linksUrl || linkTemplate).replace(`{${key}}`, replacements[key]);
            });
          } else {
            const url = new URL(linksPath, `${linksProto}://${linksHost}`);
            const queryObject = replacements;

            delete queryObject.encodedLink;

            url.search = qs.stringify({
              ...replacements,
              [linksQuery]: encodedLink,
            });
            linksUrl = url.href;
          };
          return linksUrl;
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
