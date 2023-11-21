module.exports = {
  HTML:function(title, list, body, control, authStatus){
    if(authStatus){
      authStatusUI = `<a href="/logout">${authStatus} | logout</a>`;
    }
    else{
      authStatusUI = '<a href="/login">login</a><a>\n</a><a href="/signup">signup</a>';
    }
    return `
    <!doctype html>
    <html>
    <head>
      <title>WEB1 - ${title}</title>
      <meta charset="utf-8">
    </head>
    <body>
      ${authStatusUI}
      <h1><a href="/pages">WEB</a></h1>
      ${list}
      ${control}
      ${body}
    </body>
    </html>
    `;
  },list:function(filelist){
    var list = '<ul>';
    var i = 0;
    while(filelist !== undefined && i < filelist.length){
      list = list + `<li><a href="/page/${filelist[i]}">${filelist[i]}</a></li>`;
      i = i + 1;
    }
    list = list+'</ul>';
    return list;
  }
}
