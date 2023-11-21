const express = require('express');
const router = express.Router();

router.get('/pages', function(req, res){
    var title = 'Welcome';
    var description = 'Hello, Node.js';
    var list = template.list(req.list);
    var html = template.HTML(title, list,
      `<h2>${title}</h2>${description}
      <img src="image/hello.jpg" style="width:100px; display:block;">`,
      `<a href="/page_create">create</a>`
    );
    res.send(html);
  });
  
  router.get('/page/:pageId', function(req, res, next){
    var filteredId = path.parse(req.params.pageId).base;
    fs.readFile(`data/${filteredId}`, 'utf8', function(err, description){
      if(err){
        next('Error');
      }
      else{
        var title = req.params.pageId;
        var sanitizedTitle = sanitizeHtml(title);
        var sanitizedDescription = sanitizeHtml(description, {
          allowedTags:['h1']
        });
        var list = template.list(req.list);
        var html = template.HTML(sanitizedTitle, list,
          `<h2>${sanitizedTitle}</h2>${sanitizedDescription}`,
          ` <a href="/pages">main page</a>
            <a href="/page_update/${sanitizedTitle}">update</a>
            <form action="/page_delete_process" method="post">
              <input type="hidden" name="id" value="${sanitizedTitle}">
              <input type="submit" value="delete">
            </form>`
        );
        res.send(html);
      }
    });
  });
  
  
  
  router.get('/page_create', function(req, res) {
    var title = 'WEB - create';
    var list = template.list(req.list);
    var html = template.HTML(title, list, `
      <form action="/page_create_process" method="post">
        <p><input type="text" name="title" placeholder="title"></p>
        <p>
          <textarea name="description" placeholder="description"></textarea>
        </p>
        <p>
          <input type="submit">
  
        </p>
      </form>
    `, `<a href="/pages">main page</a>`);
    res.send(html);
  });
  
  router.post('/page_create_process', function(req, res){
    var post = req.body;
    var title = post.title;
    var description = post.description;
    fs.writeFile(`data/${title}`, description, 'utf8', function(err){
        res.redirect(`/?id=${title}`);
        res.end();
    });
  });
  
  router.get('/page_update/:pageId', function(req, res) {
    var filteredId = path.parse(req.params.pageId).base;
    fs.readFile(`data/${filteredId}`, 'utf8', function(err, description){
      var title = req.params.pageId;
      var list = template.list(req.list);
      var html = template.HTML(title, list,
        `
        <form action="/page_update_process" method="post">
          <input type="hidden" name="id" value="${title}">
          <p><input type="text" name="title" placeholder="title" value="${title}"></p>
          <p>
            <textarea name="description" placeholder="description">${description}</textarea>
          </p>
          <p>
            <input type="submit">
          </p>
        </form>
        `,
        `<a href="/">main page</a>`
      );
      res.send(html);
    });
  });
  
  router.post('/page_update_process', function(req, res){
    var post = req.body;
    var id = post.id;
    var title = post.title;
    var description = post.description;
    fs.rename(`data/${id}`, `data/${title}`, function(error){
      fs.writeFile(`data/${title}`, description, 'utf8', function(err){
        res.redirect(`/page/${title}`);
      })
    });
  });
  
  router.post('/page_delete_process', function(req, res){
    var post = req.body;
    var id = post.id;
    var filteredId = path.parse(id).base;
    fs.unlink(`data/${filteredId}`, function(error){
      res.redirect('/pages');
    });
  });

module.exports = router;