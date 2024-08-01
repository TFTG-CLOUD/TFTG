import { Agenda } from 'agenda';
import { transcoding } from './ffmpeg';

const agenda = new Agenda({ db: { address: process.env.MONGO_URL! }, lockLimit: 0 });

agenda.on('ready', () => {
  console.log('agenda ready!');
})
agenda.define("auto queue", async (job: any) => {
  console.log('auto queue')
  transcoding();
});

await agenda.start();
agenda.every('30 seconds"', 'auto queue');
