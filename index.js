var mpd = require('mpd2');
var denon = require('denon-client');


const mpd_config = {
    port : 6600,
    host: '10.59.15.38'
};
const denon_ip = '10.59.15.21';

const avr = new denon.DenonClient(denon_ip);

let client = null;



async function listen(){
    client =  await mpd.connect(mpd_config);

    client.on('close', () => {
        console.log('client connection closed')
    });

    client.on('system-player', async function(){
        let status = await getMpdStatus();
        if(status.state === 'play'){
            AVRSelectInput();
        }
    });
}
async function AVRSelectInput(){
    avr
        .connect()
        .then(() => {
            return avr.setInput(denon.Options.InputOptions.CD);
        });
    console.log('AVR Power ON');
}
async function getMpdStatus(){
    return await client.sendCommand('status').then(mpd.parseObject);
}

listen();
