const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'..');
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    const body=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(body);
  }catch(e){res.writeHead(404).end();}
});
async function main(){
  await fs.mkdir(path.join(root,'test-results'),{recursive:true});
  await new Promise(resolve=>server.listen(4173,'127.0.0.1',resolve));
  const browser=await chromium.launch();
  try{
    try{
      const response=await fetch('https://zairas-universe-git-codex-mot-f14fbd-aurelbacho-cybers-projects.vercel.app');
      const body=await response.text();
      console.log(JSON.stringify({deployedPreviewStatus:response.status,finalUrl:response.url,pageTitle:(body.match(/<title[^>]*>([^<]*)<\/title>/i)||[])[1],containsMotionLab:body.includes('Motion Lab'),containsControlsScript:body.includes('src/controls.js')}));
    }catch(e){console.log(JSON.stringify({deployedPreviewFetchError:e.message}));}
    for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
      const page=await browser.newPage({viewport});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/@tensorflow/tfjs@*/**',r=>r.fulfill({contentType:'application/javascript',body:'window.tf={ready:async()=>{}};'}));
      await page.route('**/@tensorflow-models/pose-detection@*/**',r=>r.fulfill({contentType:'application/javascript',body:'window.poseDetection={movenet:{modelType:{SINGLEPOSE_LIGHTNING:"single",MULTIPOSE_LIGHTNING:"multi"}},SupportedModels:{MoveNet:"m"},TrackerType:{BoundingBox:"b"},createDetector:async()=>({estimatePoses:async()=>window.__tracking?[window.__pose()]:[],dispose(){}})};'}));
      await page.addInitScript(()=>{
        window.__cameraStops=0;window.__tracking=true;window.__tilt=0;
        window.__pose=()=>{
          const keypoints=Array.from({length:17},()=>({x:320,y:200,score:.99}));
          for(const [i,x,y]of [[5,230,130],[6,410,130],[7,210,220],[8,430,220],[9,225,215],[10,415,215+window.__tilt],[11,270,310],[12,370,310],[13,270,370],[14,370,370],[15,270,450],[16,370,450]])keypoints[i]={x,y,score:.99};
          return{score:.99,keypoints};
        };
        navigator.mediaDevices.getUserMedia=async()=>{
          const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
          const ctx=canvas.getContext('2d');ctx.fillStyle='#1a3248';ctx.fillRect(0,0,640,480);
          ctx.fillStyle='#bcd8d8';ctx.font='24px sans-serif';ctx.fillText('Simulated camera input',150,240);
          const stream=canvas.captureStream(24);
          stream.getTracks().forEach(track=>{const stop=track.stop.bind(track);track.stop=()=>{window.__cameraStops++;stop();};});
          return stream;
        };
      });
      await page.goto('http://127.0.0.1:4173/');
      await page.locator('.card').last().waitFor();
      assert.equal(await page.locator('.cat-dino').count(),0);
      assert.equal(await page.locator('.card').count(),13);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:path.join(root,'test-results','menu-'+viewport.width+'.png')});
      if(viewport.width===1280)console.log('ZAIRA_SCREENSHOT_MENU:'+(await page.screenshot({type:'jpeg',quality:55,fullPage:true})).toString('base64'));
      await page.locator('[onclick="startGame(\'car\')"]').click();
      await page.waitForFunction(()=>A.running&&A.game.ready,{},{timeout:25000});
      const distance=await page.evaluate(()=>A.game.distance);
      await page.evaluate(()=>window.__tilt=65);
      await page.waitForTimeout(900);
      assert.ok(await page.evaluate(()=>Math.abs(A.game.steer)>.2));
      assert.ok(await page.evaluate(d=>A.game.distance>d,distance));
      await page.screenshot({path:path.join(root,'test-results','cockpit-'+viewport.width+'.png')});
      if(viewport.width===1280){
        const shot=await page.screenshot({type:'jpeg',quality:45});
        console.log('ZAIRA_SCREENSHOT_DESKTOP:'+shot.toString('base64'));
      }
      if(viewport.width===390){
        const shot=await page.screenshot({type:'jpeg',quality:45});
        console.log('ZAIRA_SCREENSHOT_MOBILE:'+shot.toString('base64'));
      }
      await page.evaluate(()=>window.__tracking=false);
      await page.waitForTimeout(650);
      const paused=await page.evaluate(()=>A.game.distance);
      await page.waitForTimeout(350);
      assert.equal(await page.evaluate(()=>A.game.distance),paused);
      await page.getByRole('button',{name:'Koniec',exact:false}).click();
      await page.waitForFunction(()=>!A.running&&A.video.srcObject===null);
      assert.ok(await page.evaluate(()=>window.__cameraStops>=1));
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({viewport,passed:true,camera:'synthetic stream',model:'stub; no actual pose accuracy measured'}));
      await page.close();
    }
  }finally{await browser.close();server.close();}
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1;});
