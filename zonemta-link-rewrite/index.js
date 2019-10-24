const cheerio = require('cheerio');
const asyncifyStream = require('@oreoluwa/asyncifystream');
const PassThrough = require('stream').PassThrough;

// https://ctrlq.org/code/20294-regex-extract-links-javascript
const createTextLinks = (text) => (text || "").replace(
    /([^\S]|^)(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi,
    (match, space, url) => {
      let hyperlink = url;
      if (!hyperlink.match('^https?:\/\/')) {
        hyperlink = 'https://' + hyperlink;
      }
      return space + '<a href="' + hyperlink + '" title="' + url + '">' + url + '</a>';
    }
  );

const title = 'Track Mail Links Rewrite';

const init = (app, done) => {
  const newTabLink = app.config.openLinkInNewTab;

  app.addRewriteHook(
    (envelope, node) => ['text/html'].includes(node.contentType),
    async (envelope, node, decoder, encoder) => {

      let html = await asyncifyStream(decoder, node.charset);

      node.setCharset('utf-8');

      let updatedMail = createTextLinks(html);

      const $ = cheerio.load(updatedMail);

      if (newTabLink) $('a').attr('target', '_blank');

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
