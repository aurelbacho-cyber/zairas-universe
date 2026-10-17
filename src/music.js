/* Original 32-bar score: layered harmony, bass, motif and soft percussion. */
window.ZairaMusic=function(context,volume=.20){
  let timer=null,step=0,next=0;const nodes=new Set(),gain=context.createGain();
  gain.gain.value=volume;gain.connect(context.destination);
  const chords=[[48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,59]];
  const motif=[0,2,4,2,1,3,2,0,4,3,2,1,2,0,1,3];
  function note(midi,start,duration,type,level){
    const o=context.createOscillator(),g=context.createGain();nodes.add(o);
    o.type=type;o.frequency.value=440*Math.pow(2,(midi-69)/12);
    g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(level,start+.025);
    g.gain.exponentialRampToValueAtTime(.0001,start+duration);
    o.connect(g);g.connect(gain);o.onended=()=>{nodes.delete(o);o.disconnect();g.disconnect();};
    o.start(start);o.stop(start+duration+.02);
  }
  function schedule(){
    const sixteenth=60/88/4;
    while(next<context.currentTime+.16){
      const bar=Math.floor(step/16)%32,beat=step%16,chord=chords[Math.floor(bar/2)%4];
      if(beat===0)chord.forEach(n=>note(n+12,next,2.6,'sine',.025));
      if(beat%4===0)note(chord[0]-12,next,.45,'triangle',.065);
      if(beat%2===0){
        const index=(beat/2+bar)%chord.length;
        note(chord[index]+24,next,.32,'sine',.045);
      }
      if(bar%4>=2&&beat%4===2)note(chord[motif[(bar+beat)%motif.length]%4]+24,next,.5,'triangle',.035);
      if(beat===0||beat===8)note(30,next,.09,'sine',.08);
      if(beat===4||beat===12)note(82,next,.028,'triangle',.018);
      step++;next+=sixteenth;
    }
  }
  return{
    start(){this.stop();step=0;next=context.currentTime+.03;schedule();timer=setInterval(schedule,80);},
    stop(){if(timer!==null){clearInterval(timer);timer=null;}for(const n of nodes){try{n.stop();}catch(e){}}nodes.clear();},
    setVolume(v){gain.gain.setTargetAtTime(Math.max(0,Math.min(.5,v)),context.currentTime,.05);}
  };
};
