const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const { exec } = require('child_process');  // Menambahkan child_process untuk mengeksekusi perintah PowerShell

// Create an Express server
const app = express();
const port = 3000;

// Serve static files (for example, CSS or JS for the frontend)
app.use(express.static('public'));

// Inisialisasi Client
const client = new Client({
    authStrategy: new LocalAuth() // Simpan sesi login
});

let qrCodeUrl = ''; // To store the QR code URL

const targetGroupId = '120363330027562897@g.us'; // Contoh ID grup

// Menampilkan QR Code di browser
client.on('qr', (qr) => {
    console.log('QR Code is being generated');
    // Generate QR code as a data URL and store it
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('Error generating QR code:', err);
            return;
        }
        qrCodeUrl = url; // Save the QR code URL
        console.log('QR Code generated and stored for the browser.');
    });
});

// Jika berhasil terhubung
client.on('ready', () => {
    console.log('Bot sudah terhubung!');
});

// Respon otomatis untuk pesan
client.on('message', message => {
    console.log(`Pesan diterima: ${message.body}`);
    console.log('Pengirim:', message.author);
    console.log('Grup ID:', message.from);
    // Simpan pesan ke array untuk ditampilkan di browser
    if (message.from.includes('@g.us')) {
        console.log(`Pesan diterima dari grup dengan ID: ${message.from}`);
        if (message.from === targetGroupId) {
            if (message.author === '62895424010064@c.us') {
                if (message.body.toLowerCase().includes('halo')) {
                    client.sendMessage(message.from, `Pesan diterima dari admin! ${message.body}`);
                } else {
                    client.sendMessage(message.from, 'Pesan diterima dari admin!');
                }
            }
        }
    }
});

// Endpoint to serve the QR Code page
app.get('/', (req, res) => {
    if (!qrCodeUrl) {
        return res.send('<h1>QR Code belum tersedia</h1><p>Bot masih menunggu untuk menghasilkan QR Code...</p>');
    }
    res.send(`
        <html>
            <head>
                <title>Scan QR Code</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    #qrcode { margin: 20px; }
                    img { max-width: 100%; }
                    h1 { color: #333; }
                    p { font-size: 18px; }
                </style>
            </head>
            <body>
                <h1>Scan QR Code</h1>
                <p>Scan QR Code di bawah ini menggunakan WhatsApp Anda:</p>
                <div id="qrcode">
                    <img src="${qrCodeUrl}" alt="QR Code" />
                </div>
                <p>Jika QR code telah dipindai, Anda dapat menutup halaman ini dan lanjutkan menggunakan bot WhatsApp.</p>
                <form action="/logout" method="POST">
                    <button type="submit">Hapus Sesi</button>
                </form>
            </body>
        </html>
    `);
});

// Endpoint untuk logout / hapus sesi
app.post('/logout', (req, res) => {
    if (client) {
        client.destroy().then(() => {
            console.log('Sesi WhatsApp berhasil dihentikan');
            
            // Eksekusi perintah PowerShell untuk menghapus folder .wwebjs_auth
            exec('powershell Remove-Item -Recurse -Force .wwebjs_auth', (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error executing PowerShell command: ${error}`);
                    return res.send('Gagal menghapus sesi, coba lagi.');
                }
                console.log('Folder .wwebjs_auth berhasil dihapus');
                res.send(`
                    <html>
                        <body>
                            <h1>Sesi dihentikan!</h1>
                            <p>Bot berhasil logout dari WhatsApp, dan sesi telah dihapus. <a href="/">Kembali ke QR Code</a></p>
                        </body>
                    </html>
                `);
            });
        }).catch((err) => {
            console.error('Gagal menghentikan sesi:', err);
            res.send('Gagal menghentikan sesi, coba lagi.');
        });
    } else {
        res.send('Tidak ada sesi aktif untuk dihentikan.');
    }
});

// Mulai bot dan server
client.initialize().then(() => {
    app.listen(port, () => {
        console.log(`Server berjalan di http://localhost:${port}`);
    });
});
