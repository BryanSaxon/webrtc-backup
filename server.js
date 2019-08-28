let express = require('express.io');
let app = express();

const PORT = 5000;

app.http().io();
app.use(express.static(__dirname + '/public'));

console.log('Hello, world! The server has started on port ' + PORT);

app.get('/', (req, res) => {
  res.render('index.ejs');
});

app.io.route('ready', (req) => {
  req.io.join(req.data.chatRoom);
  req.io.join(req.data.signalRoom);

  app.io.room(req.data).broadcast('announce', {
    message: 'New client in the ' + req.data.chatRoom + ' room.'
  });
});

app.io.route('send', (req) => {
  app.io.room(req.data.room).broadcast('message', {
    message: req.data.message,
    author: req.data. author
  })
});

app.io.route('signal', (req) => {
  req.io.room(req.data.room).broadcast('signalingMessage', {
    type: req.data.type,
    message: req.data.message
  })
});

app.listen(PORT);
