/* Browser global and Node export; no camera images leave the browser. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ZairaControls=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const mix=(a,b,dt,tau)=>a+(b-a)*(1-Math.exp(-dt/tau));
  function median(xs){const a=xs.slice().sort((a,b)=>a-b);return a[Math.floor(a.length/2)];}
  function point(p,i){const k=p&&p.keypoints&&p.keypoints[i];return k&&k.score>=.35&&Number.isFinite(k.x)&&Number.isFinite(k.y)?k:null;}
  function wheelAngle(p){
    const a=point(p,9),b=point(p,10);if(!a||!b)return null;
    const ls=point(p,5),rs=point(p,6),shoulders=ls&&rs?Math.hypot(ls.x-rs.x,ls.y-rs.y):null;
    const span=Math.hypot(a.x-b.x,a.y-b.y);
    if(span<20||(shoulders&&(span<shoulders*.35||span>shoulders*2.8)))return null;
    // Convert the unoriented wrist line into mirrored screen coordinates.
    let angle=Math.atan2(b.y-a.y,-(b.x-a.x));
    while(angle>Math.PI/2)angle-=Math.PI;
    while(angle<-Math.PI/2)angle+=Math.PI;
    if(Math.abs(angle)>1.15)return null;
    return angle;
  }
  class Steering{
    constructor(sensitivity=1){this.sensitivity=sensitivity;this.reset();}
    reset(){this.samples=[];this.neutral=0;this.value=0;this.valid=false;this.calibrated=false;this.last=null;this.lastGood=null;}
    update(p,now){
      const dt=this.last===null?1/60:clamp((now-this.last)/1000,0,.1);this.last=now;
      const angle=wheelAngle(p);this.valid=angle!==null;
      if(!this.valid){this.lastGood=null;if(!this.calibrated)this.samples=[];this.value=mix(this.value,0,dt,.18);return this.snapshot();}
      if(this.lastGood!==null&&now-this.lastGood>220&&!this.calibrated)this.samples=[];
      this.lastGood=now;
      if(!this.calibrated){
        if(this.samples.length&&Math.abs(angle-median(this.samples.map(s=>s.angle)))>.12)this.samples=[];
        this.samples.push({angle,time:now});
        if(this.samples.length>=8&&now-this.samples[0].time>=800){
          this.neutral=median(this.samples.map(s=>s.angle));this.calibrated=true;
        }
        return this.snapshot();
      }
      const delta=angle-this.neutral,dead=.045;
      const target=Math.sign(delta)*clamp((Math.abs(delta)-dead)/(.65-dead)*this.sensitivity,0,1);
      this.value=mix(this.value,target,dt,.075);
      return this.snapshot();
    }
    snapshot(){return {value:this.value,valid:this.valid,ready:this.valid&&this.calibrated,progress:this.calibrated?1:Math.min(.99,this.samples.length?((this.samples[this.samples.length-1].time-this.samples[0].time)/800):0)};}
  }
  class BodyGesture{
    constructor(){this.reset();}
    reset(){this.samples=[];this.base=null;this.state='run';this.neutralSince=null;}
    update(p,now){
      const ls=point(p,5),rs=point(p,6),lh=point(p,11),rh=point(p,12);
      if(!ls||!rs||!lh||!rh){this.state='run';if(!this.base)this.samples=[];return this.state;}
      const sy=(ls.y+rs.y)/2,hy=(lh.y+rh.y)/2,torso=hy-sy;
      if(torso<12){this.state='run';return this.state;}
      if(!this.base){
        const sample={sy,hy,torso,time:now};
        if(this.samples.length&&Math.abs(hy-median(this.samples.map(s=>s.hy)))>torso*.15)this.samples=[];
        this.samples.push(sample);
        if(this.samples.length>=8&&now-this.samples[0].time>=700){
          this.base={sy:median(this.samples.map(s=>s.sy)),hy:median(this.samples.map(s=>s.hy)),torso:median(this.samples.map(s=>s.torso))};
        }
        return this.state='run';
      }
      const hip=(hy-this.base.hy)/this.base.torso;
      const shoulder=(sy-this.base.sy)/this.base.torso;
      const bend=torso/this.base.torso;
      if((hip>.17&&shoulder>.13)||(shoulder>.24&&bend<.90)){this.state='duck';this.neutralSince=null;}
      else if(hip<-.23&&shoulder<-.18&&bend>.78&&bend<1.25){this.state='jump';this.neutralSince=null;}
      else if(Math.abs(hip)<.10&&Math.abs(shoulder)<.10){this.state='run';if(this.neutralSince===null)this.neutralSince=now;
        if(now-this.neutralSince>800){this.base.sy=this.base.sy*.99+sy*.01;this.base.hy=this.base.hy*.99+hy*.01;}
      }else if(this.state==='duck'&&(hip>.09||shoulder>.12)){}else this.state='run';
      return this.state;
    }
  }
  function answerLayout(values,W,H,y=.76){
    const gap=W/values.length,r=Math.min(60,gap*.32,H*.1);
    return values.map((id,i)=>({id,x:gap*(i+.5),y:H*y,r}));
  }
  class HoldPicker{
    constructor(ms=650){this.ms=ms;this.target=null;this.since=0;this.latched=false;}
    check(hands,opts,now){
      const hits=opts.map(o=>({o,d:Math.min(...hands.map(h=>Math.hypot(h.x-o.x,h.y-o.y)))}))
        .filter(h=>h.d<=h.o.r).sort((a,b)=>a.d-b.d);
      if(!hits.length){this.target=null;this.latched=false;return{hoverId:null,progress:0,pickedId:null};}
      if(this.latched||(hits[1]&&Math.abs(hits[0].d-hits[1].d)<8))return{hoverId:null,progress:0,pickedId:null};
      const id=hits[0].o.id;if(this.target!==id){this.target=id;this.since=now;}
      const progress=clamp((now-this.since)/this.ms,0,1);
      if(progress>=1){this.latched=true;return{hoverId:id,progress:1,pickedId:id};}
      return{hoverId:id,progress,pickedId:null};
    }
  }
  function mathRound(level,rand=Math.random){
    const int=(a,b)=>a+Math.floor(rand()*(b-a+1));let a,b,op,ans;
    if(level==='baby'){a=int(1,3);b=int(1,2);op='+';ans=a+b;}
    else if(level==='kid'){a=int(2,10);b=int(1,10);op=rand()<.5?'+':'−';if(op==='−'&&a<b)[a,b]=[b,a];ans=op==='+'?a+b:a-b;}
    else{op=['+','−','×','÷'][int(0,3)];
      if(op==='×'){a=int(2,12);b=int(2,10);ans=a*b;}
      else if(op==='÷'){b=int(2,10);ans=int(2,12);a=b*ans;}
      else{a=int(12,80);b=int(3,50);if(op==='−'&&a<b)[a,b]=[b,a];ans=op==='+'?a+b:a-b;}}
    const options=[ans];for(const delta of [1,-1,2,-2,3,-3]){const n=ans+delta;if(n>=0&&!options.includes(n))options.push(n);if(options.length===3)break;}
    for(let i=options.length-1;i>0;i--){const j=int(0,i);[options[i],options[j]]=[options[j],options[i]];}
    return{a,b,op,ans,options};
  }
  function balloonProfile(tempo,age,W,H){
    const p={calm:{seconds:7.5,interval:650,max:7},lively:{seconds:5.3,interval:390,max:11},challenge:{seconds:4.2,interval:260,max:15}}[tempo]||{seconds:5.3,interval:390,max:11};
    const r=Math.min(age==='baby'?52:age==='kid'?43:35,W*.075,H*.075);
    return{...p,r};
  }
  return{clamp,mix,Steering,BodyGesture,HoldPicker,answerLayout,mathRound,balloonProfile,wheelAngle};
});
