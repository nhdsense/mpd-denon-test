var mpd = require('mpd2');
var denon = require('denon-client');


const mpd_config = {
    port : 6600,
    host: '10.59.15.38'
};
const denon_ip = '10.59.15.21';

const avr = new denon.DenonClient(denon_ip);
avr.connect();

let client = null;

let old_state = '';

let AVROnCount = 0;
let AVRStatus = 'STANDBY';
let AVRInput = 'CD';



async function listen(){
    AVRStatus = await avr.getPower();
    AVRInput = await avr.getInput();
    client =  await mpd.connect(mpd_config);
    old_state = await getMpdStatus().state;


    client.on('close', () => {
        console.log('client connection closed')
    });

    client.on('system-player', async function(){
        let status = await getMpdStatus();
        if(status.state === 'play' && old_state !== 'play'){
            if(AVRStatus !== 'ON'){
                console.log('AVR is STANDBY. MPD Paused.');
                client.sendCommand(mpd.cmd('pause', [1]));
            }

            if(AVRInput !== 'CD' || AVRStatus !== 'ON'){
                AVRSelectInput();
                if(AVRStatus === 'ON'){
                    console.log('AVR Silence due to Source Change. MPD Paused. Waiting.');
                    client.sendCommand(mpd.cmd('pause', [1]));
                    setTimeout(() => {
                        client.sendCommand(mpd.cmd('pause', [0]));
                        console.log('AVR Source Changed. MPD Resume.');
                    }, 5000);
                }
            }
            old_state = status.state;

        }else{
            old_state = status.state;
        }
    });
}
async function AVRSelectInput(){
    avr.setInput(denon.Options.InputOptions.CD);
    console.log('AVR SET CD.');
}



async function getMpdStatus(){
    return await client.sendCommand('status').then(mpd.parseObject);
}
avr.on('inputChanged', (input) => {
    if(AVRInput !== null && client !== null && old_state === 'play'){
        if(input !== 'CD' ){
            console.log('AVR is Other Source. MPD Paused.');
            client.sendCommand(mpd.cmd('pause', [1]));
        }
    }
    AVRInput = input;
});
avr.on('powerChanged', (power) => {
    if(AVRStatus !== null && client !== null && (old_state === 'play' || AVROnCount === 1) ){
        if(power === 'STANDBY' ){
            client.sendCommand(mpd.cmd('pause', [1]));
            AVROnCount = 0;
            console.log('AVR goes STANDBY. MPD Paused.');
        }else if(power === 'ON' ){
            if(AVROnCount === 1){
                client.sendCommand(mpd.cmd('pause', [0]));
                console.log('AVR Warm Up done. MPD Resume.');
                AVROnCount = 0;
            }else{
                client.sendCommand(mpd.cmd('pause', [1]));
                console.log('AVR is Warm Up NOW. MPD Paused. Waiting.');
                AVROnCount++;
            }
        }
    }

    AVRStatus = power;
});

listen();

