/* Lightweight perspective cockpit renderer on the existing Canvas 2D surface. */
window.ZairaCockpit=function({getState,Controls,score,life,pop,coin,now=()=>performance.now()}){
  const clamp=Controls.clamp;
  return class CockpitGame{
    constructor(){
      this.steering=new Controls.Steering(getState().sensitivity||1);this.cx=0;this.steer=0;
      this.items=[];this.distance=0;this.elapsed=0;this.lastSpawn=-1;this.collected=0;
      this.flash=0;this.sequence=0;this.ready=false;this.control=null;
      this.sparkles=[];this.goal=8;this.roadPhase=0;
    }
    recalibrate(){this.steering.reset();this.ready=false;}
    curve(z){return Math.sin(this.distance*.009+z*2.2)*.12*z*z;}
    update(poses,W,H,dt=1/60){
      const A=getState();
      this.control=this.steering.update(poses[0],now());
      this.ready=this.control.ready;this.steer=this.control.value;
      if(!this.ready)return;
      this.elapsed+=dt;this.roadPhase+=dt;
      const pace={calm:.20,lively:.28,challenge:.36}[A.tempo]||.28;
      this.cx=clamp(this.cx+this.steer*dt*1.3,-.82,.82);
      this.distance+=dt*pace*180;
      const gap={calm:1.7,lively:1.25,challenge:1}[A.tempo]||1.25;
      if(this.elapsed-this.lastSpawn>gap){
        const lane=[-.58,0,.58][this.sequence%3];
        this.items.push({x:lane,z:1,coin:true,hit:false});
        if(this.sequence%2===1){
          const obstacle=[-.58,0,.58][(this.sequence+1)%3];
          this.items.push({x:obstacle,z:1,coin:false,hit:false});
        }
        this.sequence++;this.lastSpawn=this.elapsed;
      }
      this.items=this.items.filter(it=>{
        const old=it.z;it.z-=dt*pace;
        if(!it.hit&&old>.08&&it.z<=.08){
          it.hit=true;
          if(Math.abs(it.x-this.cx)<(it.coin?.30:.26)){
            if(it.coin){this.collected++;score(10);coin();this.sparkles.push({x:W/2,y:H*.64,t:0});}
            else{this.flash=.28;score(-10);life();}
          }
        }
        return it.z>-.08;
      });
      this.sparkles=this.sparkles.filter(s=>(s.t+=dt)<.6);
      this.flash=Math.max(0,this.flash-dt);
    }
    project(x,z,W,H){
      const d=clamp(1-z,0,1),q=d*d;
      return{x:W*.5+(x-this.cx+this.curve(z))*W*(.025+.59*q),y:H*(.29+.49*q),scale:.06+.94*q};
    }
    draw(ctx,W,H){
      const sky=ctx.createLinearGradient(0,0,0,H);
      sky.addColorStop(0,'#181e45');sky.addColorStop(.36,'#849bbb');sky.addColorStop(.75,'#f4d3a0');
      ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#fff2c5';ctx.beginPath();ctx.arc(W*.77,H*.20,H*.055,0,Math.PI*2);ctx.fill();
      const mountain=(color,base,amp,offset)=>{
        ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,H*.48);
        for(let x=0;x<=W+16;x+=16){const y=base-Math.abs(Math.sin(x/W*5+offset))*amp-Math.sin(x/W*12+offset)*amp*.15;ctx.lineTo(x,y);}
        ctx.lineTo(W,H*.50);ctx.lineTo(0,H*.50);ctx.fill();
      };
      mountain('#586c91',H*.36,H*.09,this.distance*.0004);
      mountain('#395970',H*.40,H*.07,2+this.distance*.001);
      ctx.fillStyle='#527e69';ctx.fillRect(0,H*.39,W,H*.61);
      for(let i=55;i>=0;i--){
        const z0=i/56,z1=(i+1)/56;
        const p0=this.project(0,z0,W,H),p1=this.project(0,z1,W,H);
        const half0=W*(.027+.65*(1-z0)**2),half1=W*(.027+.65*(1-z1)**2);
        ctx.fillStyle=(Math.floor(i+this.distance*.20)%6<3)?'#354655':'#394b5a';
        ctx.beginPath();ctx.moveTo(p1.x-half1,p1.y);ctx.lineTo(p1.x+half1,p1.y);ctx.lineTo(p0.x+half0,p0.y);ctx.lineTo(p0.x-half0,p0.y);ctx.closePath();ctx.fill();
        for(const side of [-1,1]){
          ctx.fillStyle='#eadcb7';ctx.beginPath();ctx.moveTo(p1.x+side*half1,p1.y);ctx.lineTo(p0.x+side*half0,p0.y);ctx.lineTo(p0.x+side*half0*.97,p0.y);ctx.lineTo(p1.x+side*half1*.97,p1.y);ctx.fill();
        }
        if((Math.floor(i+this.distance*.20)%8)<4){
          for(const k of [-.33,.33]){
            ctx.fillStyle='#d9e6e9';ctx.beginPath();ctx.moveTo(p1.x+k*half1,p1.y);ctx.lineTo(p0.x+k*half0,p0.y);ctx.lineTo(p0.x+(k+.012)*half0,p0.y);ctx.lineTo(p1.x+(k+.012)*half1,p1.y);ctx.fill();
          }
        }
      }
      this.items.slice().sort((a,b)=>b.z-a.z).forEach(it=>{
        if(it.z<0)return;const p=this.project(it.x,it.z,W,H),s=Math.min(W,H)*p.scale;
        ctx.save();ctx.translate(p.x,p.y);
        if(it.coin){
          ctx.scale(.7+.2*Math.sin(this.elapsed*4+it.z),1);
          ctx.shadowColor='#ffe8a2';ctx.shadowBlur=14*p.scale;
          ctx.fillStyle='#f7c75e';ctx.beginPath();ctx.arc(0,-s*.055,s*.038,0,Math.PI*2);ctx.fill();
          ctx.strokeStyle='#fff4d4';ctx.lineWidth=Math.max(1,s*.005);ctx.stroke();
          ctx.fillStyle='#a66b28';ctx.font='bold '+Math.max(9,s*.038)+'px Nunito';ctx.textAlign='center';ctx.fillText('*',0,-s*.042);
        }else{
          ctx.fillStyle='#ea8963';ctx.beginPath();ctx.moveTo(-s*.055,0);ctx.lineTo(-s*.028,-s*.10);ctx.lineTo(s*.028,-s*.10);ctx.lineTo(s*.055,0);ctx.closePath();ctx.fill();
          ctx.fillStyle='#fff1d3';ctx.fillRect(-s*.04,-s*.046,s*.08,s*.017);
          ctx.fillStyle='#2a3648';ctx.fillRect(-s*.065,-s*.008,s*.13,s*.016);
        }
        ctx.restore();
      });
      this.sparkles.forEach(s=>{
        ctx.save();ctx.globalAlpha=1-s.t/.6;ctx.strokeStyle='#ffe09a';ctx.lineWidth=3;
        for(let i=0;i<10;i++){const a=i*Math.PI/5,r=s.t*150;ctx.beginPath();ctx.moveTo(s.x+Math.cos(a)*r,s.y+Math.sin(a)*r);ctx.lineTo(s.x+Math.cos(a)*(r+12),s.y+Math.sin(a)*(r+12));ctx.stroke();}
        ctx.restore();
      });
      // Windscreen frame and dashboard: scene stays readable above the dashboard.
      ctx.strokeStyle='#111e31';ctx.lineWidth=Math.max(10,W*.018);ctx.beginPath();ctx.moveTo(0,H*.05);ctx.lineTo(W*.11,H*.78);ctx.moveTo(W,H*.05);ctx.lineTo(W*.89,H*.78);ctx.stroke();
      const dash=ctx.createLinearGradient(0,H*.77,0,H);dash.addColorStop(0,'#304358');dash.addColorStop(.12,'#1c2d41');dash.addColorStop(1,'#0b1425');
      ctx.fillStyle=dash;ctx.beginPath();ctx.moveTo(0,H*.81);ctx.quadraticCurveTo(W*.5,H*.71,W,H*.81);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
      ctx.strokeStyle='#80c9cb';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W*.10,H*.81);ctx.quadraticCurveTo(W*.5,H*.74,W*.90,H*.81);ctx.stroke();
      const wr=Math.min(W*.15,H*.16);ctx.save();ctx.translate(W*.5,H*.93);ctx.rotate(this.steer*.9);
      ctx.strokeStyle='#0a111d';ctx.lineWidth=wr*.25;ctx.beginPath();ctx.arc(0,0,wr,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle='#7794a8';ctx.lineWidth=wr*.035;ctx.beginPath();ctx.arc(0,0,wr*.98,Math.PI,Math.PI*2);ctx.stroke();
      ctx.strokeStyle='#334a62';ctx.lineWidth=wr*.16;
      for(const a of [0,Math.PI,Math.PI/2]){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*wr*.84,Math.sin(a)*wr*.84);ctx.stroke();}
      ctx.fillStyle='#15253b';ctx.beginPath();ctx.arc(0,0,wr*.32,0,Math.PI*2);ctx.fill();ctx.restore();
      ctx.fillStyle='#d9f5f0';ctx.textAlign='center';ctx.font='700 '+Math.max(12,Math.min(W*.022,18))+'px Nunito';
      ctx.fillText(Math.floor(this.distance)+' m',W*.26,H*.87);
      ctx.fillText(this.collected+' / '+(Math.floor(this.collected/this.goal)+1)*this.goal,W*.75,H*.87);
      const message=this.control&&this.control.ready?'Otáčaj rukami ako volantom':this.control&&this.control.valid?'Drž volant rovno... '+Math.round(this.control.progress*100)+' %':'Ukáž obe zápästia pred telom';
      const tw=Math.min(W-24,500),ty=H*.66;ctx.fillStyle='rgba(13,26,44,.88)';ctx.fillRect((W-tw)/2,ty,tw,42);
      ctx.fillStyle='#f2f7ff';ctx.fillText(message,W/2,ty+26);
      if(this.flash>0){ctx.fillStyle='rgba(255,150,80,'+(this.flash*.3)+')';ctx.fillRect(0,0,W,H);}
    }
  };
};
