const { Client, LocalAuth, MessageMedia, List, Location } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const mime = require('mime-types');
const port = process.env.PORT || 8000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({
extended: true
}));
app.use(fileUpload({
debug: true
}));
app.use("/", express.static(__dirname + "/"))

app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname
  });
});

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'api-samuel' }),
  puppeteer: { headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu'
    ] }
});

client.initialize();

io.on('connection', function(socket) {
  socket.emit('message', '© api-samuel - Iniciado');
  socket.emit('qr', './icon.svg');

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', '© api-samuel - QRCode recebido, aponte a câmera  seu celular!');
    });
});

client.on('ready', () => {
    socket.emit('ready', '© api-samuel - Dispositivo pronto!');
    socket.emit('message', '© api-samuel - Dispositivo pronto!');
    socket.emit('qr', './check.svg')	
    console.log('© api-samuel - Dispositivo pronto');
});

client.on('authenticated', () => {
    socket.emit('authenticated', '© api-samuel - Autenticado!');
    socket.emit('message', '© api-samuel - Autenticado!');
    console.log('© api-samuel - Autenticado');
});

client.on('auth_failure', function() {
    socket.emit('message', '© api-samuel - Falha na autenticação, reiniciando...');
    console.error('© api-samuel - Falha na autenticação');
});

client.on('change_state', state => {
  console.log('© api-samuel - Status de conexão: ', state );
});

client.on('disconnected', (reason) => {
  socket.emit('message', '© api-samuel - Cliente desconectado!');
  console.log('© api-samuel - Cliente desconectado', reason);
  client.initialize();
});
});

// Send message
app.post('/send-message', [
  body('number').notEmpty(),
  body('message').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = req.body.number;
  const numberDDD = number.substr(0, 2);
  const numberUser = number.substr(-8, 8);
  const message = req.body.message;

  if (numberDDD <= 30) {
    const numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
    client.sendMessage(numberZDG, message).then(response => {
    res.status(200).json({
      status: true,
      message: 'api-samuel - Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'api-samuel - Mensagem não enviada',
      response: err.text
    });
    });
  }
  else if (numberDDD > 30) {
    const numberZDG = "55" + numberDDD + numberUser + "@c.us";
    client.sendMessage(numberZDG, message).then(response => {
    res.status(200).json({
      status: true,
      message: 'api-samuel - Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'api-samuel - Mensagem não enviada',
      response: err.text
    });
    });
  }
});


// Send media
app.post('/send-media', async (req, res) => {
  const number = req.body.number;
  const numberDDD = number.substr(0, 2);
  const numberUser = number.substr(-8, 8);
  const caption = req.body.caption;
  const fileUrl = req.body.file;

  let mimetype;
  const attachment = await axios.get(fileUrl, {
    responseType: 'arraybuffer'
  }).then(response => {
    mimetype = response.headers['content-type'];
    return response.data.toString('base64');
  });

  const media = new MessageMedia(mimetype, attachment, 'Media');

  if (numberDDD <= 30) {
    const numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
    client.sendMessage(numberZDG, media, {caption: caption}).then(response => {
    res.status(200).json({
      status: true,
      message: 'api-samuel - Imagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'api-samuel - Imagem não enviada',
      response: err.text
    });
    });
  }

  else if (numberDDD > 30) {
    const numberZDG = "55" + numberDDD + numberUser + "@c.us";
    client.sendMessage(numberZDG, media, {caption: caption}).then(response => {
    res.status(200).json({
      status: true,
      message: 'api-samuel - Imagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'api-samuel - Imagem não enviada',
      response: err.text
    });
    });
  }
});


client.on('message', async msg => {

  if (msg.body === 'list') {
    let sections = [{title:'Title seção',rows:[{title:'Item 1 da Lista', description: 'Descrição'},{title:'Item 2 da Lista', description: 'Descrição'},{title:'Item 3 da Lista', description: 'Descrição 3'}]}];
    let list = new List('Corpo da Lista','botão da lista',sections,'Título da Lista','Roda-pé da Lista');
    client.sendMessage(msg.from, list);
  }
  else if (msg.body === 'location') {
    msg.reply(new Location(37.422, -122.084, 'ZAP das Galáxias\nZDG'));
  }
  else if (msg.body === 'media') {
    const media = MessageMedia.fromFilePath('./images/1.jpeg');
    client.sendMessage(msg.from, media, {caption: 'oi'});
  }   
  else if (msg.body === 'media2') {
    const media = MessageMedia.fromFilePath('./5511968013807@c.us.ogg');
    client.sendMessage(msg.from, media);
  } 

});

    
server.listen(port, function() {
        console.log('App running on *: ' + port);
});
