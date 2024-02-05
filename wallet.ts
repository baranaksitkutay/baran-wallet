// Solana web3.js kütüphanesini ve Node.js file system
import * as web3 from '@solana/web3.js';
import fs from 'fs';

// Solana'nın devnet ortamına bağlantı kur. 'confirmed' durumunu kullanarak işlemlerin onay durumunu bekleyecek
const connection = new web3.Connection(web3.clusterApiUrl('testnet'), 'confirmed');
console.log('\x1b[32m%s\x1b[0m', 'Devnet\'e başarıyla bağlandı!'); // Yeşil renkte mesaj

//typescript geri arama yaptırmıyor
/*
const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed', (err, info) => {
  if (err) {
    console.error(`Bağlantı hatası: ${err}`);
  } else {
    console.log('\x1b[32m%s\x1b[0m', 'Devnet\'e başarıyla bağlandı!'); // Yeşil renkte mesaj
  }
});
*/

// Cüzdan bilgilerinin kaydedileceği dosyanın adı
const walletFile = 'wallet2.json';

// Yeni bir cüzdan oluşturma fonksiyonu
async function createWallet() {
    // Yeni bir anahtar çifti (cüzdan) oluştur
    const wallet = web3.Keypair.generate();

    // Cüzdan bilgilerini (public key ve secret key) bir nesneye dönüştür
    const walletData = {
        publicKey: wallet.publicKey.toString(), // Public key'i string olarak kaydet
        secretKey: Array.from(wallet.secretKey), // Secret key'i array olarak kaydet
    };

    // Oluşturulan cüzdan bilgilerini JSON formatında dosyaya yaz
    fs.writeFileSync(walletFile, JSON.stringify(walletData, null, 2));

    // Kullanıcıya cüzdan oluşturulduğunu bildir
    console.log('Cüzdan oluşturuldu ve kaydedildi:', walletData.publicKey);
    
    // Yeni oluşturulan cüzdana airdrop yap
    await getAirdrop(wallet.publicKey);
}

// Belirli bir miktarda SOL airdrop yapma fonksiyonu
async function getAirdrop(publicKey: web3.PublicKey, amount: number = 1) {
    console.log(`Airdropping ${amount} SOL to ${publicKey.toString()}...`);

    // Airdrop isteği gönder ve imzayı al
    const airdropSignature = await connection.requestAirdrop(
        publicKey,
        amount * web3.LAMPORTS_PER_SOL // SOL miktarını lamports birimine çevir
    );

    // Airdrop işleminin tamamlandığını onayla
    await connection.confirmTransaction(airdropSignature);
    console.log('Airdrop tamamlandı.');
}

// Cüzdan bakiyesini kontrol etme fonksiyonu
async function checkBalance() {
    // wallet2.json dosyasından cüzdan bilgilerini oku
    const walletData = JSON.parse(fs.readFileSync(walletFile, 'utf8'));
    const publicKey = new web3.PublicKey(walletData.publicKey);

    // Cüzdanın bakiyesini sorgula
    const balance = await connection.getBalance(publicKey);

    // Bakiyeyi SOL cinsinden kullanıcıya göster
    console.log(`Bakiye: ${balance / web3.LAMPORTS_PER_SOL} SOL`);
}

// SOL transferi yapma fonksiyonu
async function transfer(toPublicKeyStr: string, amount: number) {
    // wallet2.json dosyasından cüzdan bilgilerini oku
    const walletData = JSON.parse(fs.readFileSync(walletFile, 'utf8'));
    const fromWallet = web3.Keypair.fromSecretKey(new Uint8Array(walletData.secretKey));
    const toPublicKey = new web3.PublicKey(toPublicKeyStr);

    // Transfer işlemi için bir işlem oluştur
    const transaction = new web3.Transaction().add(
        web3.SystemProgram.transfer({
            fromPubkey: fromWallet.publicKey,
            toPubkey: toPublicKey,
            lamports: amount * web3.LAMPORTS_PER_SOL, // Transfer edilecek miktarı lamports birimine çevir
        }),
    );

    // Transfer işlemini gerçekleştir ve sonucu logla
    const signature = await web3.sendAndConfirmTransaction(connection, transaction, [fromWallet]);
    console.log('Transfer tamamlandı, işlem imzası:', signature);
}

// Ana fonksiyon, komut satırı argümanlarına göre uygun işlevi çağırır
function main() {
    const args = process.argv.slice(2); // Komut satırı argümanlarını al
    switch (args[0]) {
        case 'new': // Yeni cüzdan oluşturma
            createWallet();
            break;
        case 'airdrop': // Airdrop alma
            const amount = args[1] ? parseInt(args[1], 10) : 1;
            getAirdrop(new web3.PublicKey(JSON.parse(fs.readFileSync(walletFile, 'utf8')).publicKey), amount);
            break;
        case 'balance': // Bakiye kontrolü
            checkBalance();
            break;
        case 'transfer': // SOL transferi
            if (args.length < 3) {
                console.log('Usage: transfer <toPublicKey> <amount>');
                return;
            }
            transfer(args[1], parseFloat(args[2]));
            break;
        default: // Tanımlanmamış bir komut girildiyse
            console.log('Komut tanınmadı. args: new, airdrop, balance, transfer');
    }
}

// Ana fonksiyonu çağır
main();
