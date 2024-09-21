const express = require("express"),
  app = express(),
  os = require("os"),
  server = require("http").Server(app),
  cors = require("cors"),
  io = require("socket.io")(server),
  port = 3000,
  path = require("path"),
  bodyParser = require("body-parser"),
  thinkgear = require("node-thinkgear-sockets"),
  client = thinkgear.createClient({ enableRawOutput: false }),
  { SerialPort } = require("serialport"),
  { ReadlineParser } = require("serialport"),
  sqlite3 = require("sqlite3"),
  fs = require("fs");
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  credentials: true,
}));

const ioClient = require("socket.io-client")

const socketClient2 = ioClient.connect("http://192.168.1.122:3000")



app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("views"));
app.options('*', cors());

// Initialize the SQLite database
const db = new sqlite3.Database("MindwaveFootballData.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the sqlite3 database");
  }
});

// Create table if it doesn't exist
db.run(
  "CREATE TABLE IF NOT EXISTS users_data (id INTEGER PRIMARY KEY, PlayerOne TEXT, PlayerTwo TEXT,PlayerThree TEXT,PlayerFour TEXT, WinnerName TEXT, GameDuration TEXT)"
);



// Route handlers
app.get("/", function (req, res) {
  res.render("index.ejs");
});

app.get("/form", function (req, res) {
  res.render("form.ejs");
});

app.get("/settings", function (req, res) {
  res.render("settings.ejs");
});

// Start the server
server.listen(port, () => {
  const ipaddress = getServerIPAddress();
  console.log(`Server listening on http://${ipaddress}:${port} `);
});





// Declare usbport as a global variable
// Function to detect the Silicon Labs CP210x device and set up the serial port
// const findSiliconLabsPort = () => {
//   SerialPort.list().then((ports) => {
//     const siliconLabsPort = ports.find(port =>
//       port.vendorId === '10C4' && port.productId === 'EA60'
//     );

//     if (siliconLabsPort) {
//       console.log(`Silicon Labs CP210x device found on port ${siliconLabsPort.path}`);

//       // Initialize the serial port with the detected Silicon Labs COM port
//       usbport = new SerialPort({
//         path: siliconLabsPort.path,
//         baudRate: 115200, //115200
//       });

//       const parser = new ReadlineParser();
//       usbport.pipe(parser);
//       parser.on("data", function (data) {
//         console.log("Data from Arduino:", data);

//           io.emit("winnerValueR", data);



//           usbport.write("f", function (err) {
//             if (err) {
//               return console.log("Error on write: ", err.message);
//             }
//             console.log("Message written: 'f'");
//           });

          
//       });

//       socketClient2.on("winner2Value", function (winner) {
//         console.log("winner2recived from ardino of laptpop2 ", winner);
//         io.emit("winnerValueR", winner);
//       });
      
    
     
//     } else {
//       console.error("Silicon Labs CP210x device not found");
//     }
//   }).catch((err) => {
//     console.error("Error listing COM ports:", err.message);
//   });
// };

let usbport;

// Function to detect the Silicon Labs CP210x device and set up the serial port
const findSiliconLabsPort = () => {
  SerialPort.list().then((ports) => {
    const siliconLabsPort = ports.find(port =>
      port.vendorId === '10C4' && port.productId === 'EA60'
    );

    if (siliconLabsPort) {
      console.log(`Silicon Labs CP210x device found on port ${siliconLabsPort.path}`);

      // Initialize the serial port with the detected Silicon Labs COM port
      usbport = new SerialPort({
        path: siliconLabsPort.path,
        baudRate: 115200, //115200
      });

      const parser = new ReadlineParser();
      usbport.pipe(parser);
      parser.on("data", function (data) {
        console.log("Data from Arduino:", data);
      
        // Emit only when a winner is detected (triggered)
        handleWinner(data);
      });
      
      // Handle data from socketClient2 (laptop 2)
      socketClient2.on("winner2Value", function (data) {
        console.log("Winner received from laptop 2 Arduino:", data);
      
        // Emit only when a winner is detected
        handleWinner(data);
      });
       
    } else {
      console.error("Silicon Labs CP210x device not found");
    }
  }).catch((err) => {
    console.error("Error listing COM ports:", err.message);
  });
};


findSiliconLabsPort();




// Helper to write data to the USB port
const writeFToUsbPort = () => {
  if (usbport) {
    usbport.write("f", function (err) {
      if (err) {
        return console.log("Error on write: ", err.message);
      }
      console.log("Message written: 'f'");
    });
  } else {
    console.error("USB port is not initialized");
  }
};


// Helper to write data to the USB port
const writeRToUsbPort = () => {
  if (usbport) {
    usbport.write("r", function (err) {
      if (err) {
        return console.log("Error on write: ", err.message);
      }
      console.log("Message written: 'r'");
    });
  } else {
    console.error("USB port is not initialized");
  }
};

// Common handler function for all winner events
const handleWinner = (winnerData) => {
  console.log("Winner detected:", winnerData);

  // Emit winnerValueR to all clients in the room
  io.to(roomName).emit("winnerValueR", winnerData);

  // Write 'f' to the USB port
  writeFToUsbPort();

  setTimeout(() => {
    writeRToUsbPort();
    
  }, 5000);
};




// Connect the MindWave client
client.connect();
client.on("data", function (data) {
  const attentionData = data.eSense.attention;
  console.log(attentionData, "data coming from thinkgear");
  io.emit("meditation", attentionData);


});

const roomName = "clientsRoom"; // Example room name (you can customize this)

// Socket.IO connection handling
io.on("connection", function (socket) {
  console.log("Client connected via Socket.IO");

  socket.join(roomName);
  console.log(`Client joined room: ${roomName}`);

  // Handle player submission
  socket.on("submit-players", (data) => {
    console.log("Received player data:", data);
    io.emit("startGame", data);
  });



  socket.on("speedSending", (data) => {
    console.log("data coming for speed from client")
    if (!usbport) {
      console.error("USB port is not initialized.");
      return;
    }


    if (data === 'a') {
      console.log("writting aaaaa to usb ")
      usbport.write("a", function (err) {
        if (err) {
          return console.log("Error on write: ", err.message);
        }
        console.log("Message written: 'a'");
      });
    } else if (data === 'b') {
      console.log("writting bbbbb to usb ")

      usbport.write("b", function (err) {
        if (err) {
          return console.log("Error on write: ", err.message);
        }
        console.log("Message written: 'b'");
      });
    } else if (data === 'c') {
      console.log("writting ccccc to usb ")

      usbport.write("c", function (err) {
        if (err) {
          return console.log("Error on write: ", err.message);
        }
        console.log("Message written: 'c'");
      });
    }
    else if (data === 'd') {
      console.log("writting dddd to usb ")

      usbport.write("d", function (err) {

        if (err) {
          return console.log("Error on write: ", err.message);
        }
        console.log("Message written: 'd'");
      });
    }

  });

  socket.on("countdownEnd", (data) => {
    console.log("data received: ", data);
    io.to(roomName).emit("connectGame", data); // Emit to the room
    console.log("Emitted to All: ", data);
    usbport.write("s", function (err) {
      if (err) {
        return console.log("Error on write: ", err.message);
      }
      console.log("Message written: 'ssssss'");
    });

  });



  socket.on("gameResult", (data) => {
    console.log("data received: " + data);
    const { playerOneName, playerTwoName, playerThreeName, playerFourName, winnerName, gameDuration } = data;

    // Insert data into the users_data table
    const query = `INSERT INTO users_data (PlayerOne, PlayerTwo, playerThree ,playerFour, WinnerName, GameDuration) VALUES (?, ?, ?, ?, ?, ?)`;

    db.run(query, [playerOneName, playerTwoName, playerThreeName, playerFourName, winnerName, gameDuration], function (err) {
      if (err) {
        return console.error('Error inserting data:', err.message);
      }
      console.log(`Game result inserted with ID: ${this.lastID}`);
    });
  });

});


//export database to CSV
app.get('/export', (req, res) => {
  const csvFile = 'exported_data.csv';
  const query = "SELECT * FROM users_data";

  db.all(query, [], (err, rows) => {
    if (err) {
      return console.error('Error fetching data:', err.message);
    }

    const header = "ID,PlayerOne,PlayerTwo,playerThree, playerFour, WinnerName,GameDuration\n";
    const csvData = rows.map(row => `${row.id},${row.PlayerOne},${row.PlayerTwo},${row.WinnerName},${row.GameDuration}`).join("\n");

    fs.writeFile(csvFile, header + csvData, function (err) {
      if (err) {
        return console.error('Error writing file:', err.message);
      }
      console.log(`Data exported to ${csvFile}`);
      res.download(csvFile); // Send file to the client
    });
  });
});

// Endpoint to reset database (delete all records)
app.post('/reset', (req, res) => {
  const query = "DELETE FROM users_data";

  db.run(query, function (err) {
    if (err) {
      console.error('Error resetting data:', err.message);
      return res.json({ success: false, message: 'Error resetting database.' });
    }
    console.log('All data has been deleted.');
    res.json({ success: true, message: 'Database reset successfully.' });
  });
});

function getServerIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    const addresses = interfaces[interfaceName];
    for (const addressInfo of addresses) {
      if (addressInfo.family === 'IPv4' && !addressInfo.internal) {
        return addressInfo.address;
      }
    }
  }
  return '0.0.0.0';
}



