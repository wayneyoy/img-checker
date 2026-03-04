/* ============================================================
   图片取证检查器 · app.js  v1.1
   五维度参数全量解析 + 格式转换 / 体积压缩 / 尺寸调整
   ============================================================ */

'use strict';

// ============================================================
// 1. 常量
// ============================================================

const IJG_LUMA_STD = [
  16,11,10,16,24,40,51,61,
  12,12,14,19,26,58,60,55,
  14,13,16,24,40,57,69,56,
  14,17,22,29,51,87,80,62,
  18,22,37,56,68,109,103,77,
  24,35,55,64,81,104,113,92,
  49,64,78,87,103,121,120,101,
  72,92,95,98,112,100,103,99
];

const AI_RESOLUTIONS = new Set([
  '512x512','768x512','512x768','768x768',
  '1024x1024','768x1024','1024x768',
  '1152x896','896x1152','1216x832','832x1216',
  '1344x768','768x1344','1536x640','640x1536',
  '1024x1792','1792x1024','1024x1536','1536x1024',
]);

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// 尺寸调整预设
const SIZE_PRESETS = [
  { label: '千图Banner',  w: 700,  h: 332,  note: '2.1:1', targetKB: 150 },
  { label: 'mini推荐横图', w: 320,  h: 240,  note: '4:3',   targetKB: 40  },
  { label: 'mini推荐方图', w: 720,  h: 720,  note: '1:1',   targetKB: 200 },
  { label: '小红书封面',  w: 1080, h: 1440, note: '3:4' },
  { label: '小红书正方',  w: 1080, h: 1080, note: '1:1' },
  { label: '抖音封面',    w: 1080, h: 1920, note: '9:16' },
  { label: '微博横图',    w: 1920, h: 1080, note: '16:9' },
  { label: '微信封面',    w: 900,  h: 383,  note: '2.35:1' },
  { label: '千图首图',    w: 1920, h: 1080, note: '16:9' },
  { label: '头像',        w: 800,  h: 800,  note: '1:1' },
  { label: '分享缩略图',  w: 500,  h: 500,  note: '1:1' },
];

// ============================================================
// 品牌 / IP 版权风险数据库
// ============================================================
// 品牌/IP 关键词库 — 与 skill/BRAND-IP-LIBRARY.md 同步
// 分值说明：5=完整角色形象 4=核心Logo 3=品牌图案 2=局部特征
const BRAND_DB = {
  disney_classic: {
    label: '迪士尼经典角色', risk: 'high', color: 'danger',
    keywords: ['mickey mouse','minnie mouse','donald duck','daisy duck','goofy','pluto disney','winnie the pooh','tigger','eeyore','piglet','disney princess','snow white','cinderella','sleeping beauty','ariel little mermaid','belle beauty beast','jasmine aladdin','mulan disney','rapunzel tangled','elsa frozen','anna frozen','moana disney','raya disney'],
  },
  pixar: {
    label: '皮克斯 Pixar', risk: 'high', color: 'danger',
    keywords: ['woody toy story','buzz lightyear','nemo','dory','mike wazowski','james p sullivan','sully monsters inc','lightning mcqueen','wall-e','up pixar','coco pixar','soul pixar','inside out','incredibles','ratatouille'],
  },
  marvel: {
    label: '漫威 Marvel', risk: 'high', color: 'danger',
    keywords: ['spider-man','spiderman','iron man','captain america','thor marvel','hulk marvel','black widow','black panther','thanos','deadpool','avengers','marvel logo','x-men','doctor strange','ant-man','captain marvel','hawkeye','scarlet witch','guardians galaxy'],
  },
  star_wars: {
    label: '星球大战', risk: 'high', color: 'danger',
    keywords: ['darth vader','yoda','bb-8','r2-d2','stormtrooper','luke skywalker','star wars logo','millennium falcon','lightsaber','mandalorian','grogu baby yoda'],
  },
  dc_comics: {
    label: 'DC 漫画', risk: 'high', color: 'danger',
    keywords: ['batman','superman','wonder woman','flash dc','green lantern','aquaman','joker dc','harley quinn','lex luthor','gotham'],
  },
  looney_tunes: {
    label: '乐一通 Looney Tunes', risk: 'high', color: 'danger',
    keywords: ['bugs bunny','daffy duck','tweety bird','sylvester cat','porsche pig','wile coyote','road runner looney','looney tunes'],
  },
  sanrio: {
    label: '三丽鸥 Sanrio', risk: 'high', color: 'danger',
    keywords: ['hello kitty','kuromi','my melody','cinnamoroll','pompompurin','little twin stars','keroppi','tuxedosam','aggretsuko','gudetama','sanrio'],
  },
  popmart: {
    label: '泡泡玛特 Pop Mart', risk: 'high', color: 'danger',
    keywords: ['molly popmart','skullpanda','dimoo','hirono','labubu','pucky','crybaby popmart','the monsters popmart','pop mart'],
  },
  nintendo: {
    label: '任天堂 Nintendo', risk: 'high', color: 'danger',
    keywords: ['mario','luigi','yoshi','princess peach','bowser','link zelda','zelda nintendo','splatoon','animal crossing','metroid','kirby nintendo','donkey kong','pikmin'],
  },
  pokemon: {
    label: '宝可梦 Pokémon', risk: 'high', color: 'danger',
    keywords: ['pokemon','pikachu','charizard','mewtwo','snorlax','eevee','gengar','bulbasaur','squirtle','pokeball','poke ball','jigglypuff','meowth','gyarados','umbreon','sylveon'],
  },
  jp_anime_shueisha: {
    label: '日本动漫（集英社）', risk: 'high', color: 'danger',
    keywords: ['naruto','naruto uzumaki','sasuke','kakashi','one piece','luffy','zoro','nami','dragon ball','goku','vegeta','demon slayer','kimetsu','tanjiro','nezuko','my hero academia','deku','all might','jujutsu kaisen','gojo satoru','chainsaw man','bleach ichigo','hunter x hunter','fullmetal alchemist','death note','boruto'],
  },
  jp_anime_other: {
    label: '日本动漫（其他）', risk: 'high', color: 'danger',
    keywords: ['doraemon','nobita','sailor moon','detective conan','conan edogawa','evangelion','neon genesis','gundam','totoro','spirited away','howls moving castle','studio ghibli','no face spirited','nausicaa','princess mononoke','kiki delivery','lupin iii','dragonball dbz','attack on titan','titan aot'],
  },
  kr_ip: {
    label: '韩国 IP', risk: 'high', color: 'danger',
    keywords: ['ryan kakao','apeach kakao','kakao friends','bt21','tata bts','koya bt21','rj bt21','chimmy bt21','cooky bt21','mang bt21','van bt21','line friends'],
  },
  cartoon_cn: {
    label: '中国 IP', risk: 'high', color: 'danger',
    keywords: ['喜羊羊','灰太狼','懒羊羊','美羊羊','熊大','熊二','光头强','熊出没','猪猪侠','葫芦娃','黑猫警长','哪吒','新神榜','天官赐福','魔道祖师','陈情令','王者荣耀','原神','genshin impact','nezha animation'],
  },
  luxury: {
    label: '奢侈品牌', risk: 'high', color: 'danger',
    keywords: ['louis vuitton','lv monogram','lv damier','gucci','double g gucci','chanel','chanel 2.55','hermès','hermes birkin','hermes kelly','prada','dior','christian dior','lady dior','versace medusa','burberry plaid','balenciaga','fendi ff','ysl','saint laurent','bottega veneta','intrecciato','miu miu','givenchy','valentino','moncler','bulgari bvlgari','tiffany','van cleef','omega watch','patek philippe','rolex','cartier','off-white virgil'],
  },
  sports: {
    label: '运动品牌', risk: 'high', color: 'danger',
    keywords: ['nike swoosh','just do it nike','adidas three stripes','adidas trefoil','jordan jumpman','new balance logo','puma logo','under armour','converse star','vans logo','supreme box logo','off-white brand','reebok','asics','yeezy'],
  },
  tech: {
    label: '科技品牌', risk: 'medium', color: 'warn',
    keywords: ['apple logo','apple bite','iphone logo','macbook','google logo','youtube logo','instagram logo','facebook logo','meta logo','twitter bird','x twitter','tiktok logo','wechat logo','weixin','microsoft logo','windows logo','xbox','playstation logo','nintendo logo','adobe logo','openai','chatgpt logo','spotify','netflix logo','amazon logo'],
  },
  food_bev: {
    label: '餐饮食品', risk: 'medium', color: 'warn',
    keywords: ["mcdonald's",'mcdonalds golden arches','kfc colonel','starbucks siren','coca-cola script','pepsi globe','red bull','michelin man','oreo','m&m','haagen-dazs','heineken','budweiser'],
  },
  auto_luxury: {
    label: '豪华汽车', risk: 'medium', color: 'warn',
    keywords: ['ferrari logo','lamborghini logo','porsche logo','bugatti logo','bentley logo','rolls royce','maserati logo','aston martin','mclaren logo','koenigsegg','pagani'],
  },
};

const PLATFORMS = [
  { name:'小红书封面', formats:['JPEG','PNG','WebP'], maxSizeBytes:20*1024*1024, minWidth:1080, minHeight:1440, aspectRatio:{w:3,h:4,tolerance:.08}, spec:'3:4 (1080×1440) ≤20MB' },
  { name:'小红书正文', formats:['JPEG','PNG','WebP'], maxSizeBytes:20*1024*1024, minWidth:800, spec:'宽≥800px ≤20MB' },
  { name:'抖音封面',   formats:['JPEG','PNG'], maxSizeBytes:5*1024*1024, minWidth:1080, minHeight:1920, aspectRatio:{w:9,h:16,tolerance:.08}, spec:'9:16 (1080×1920) ≤5MB' },
  { name:'微博单图',   formats:['JPEG','PNG','GIF'], maxSizeBytes:20*1024*1024, minWidth:900, spec:'宽≥900px ≤20MB' },
  { name:'微信公众号封面', formats:['JPEG','PNG'], maxSizeBytes:10*1024*1024, minWidth:900, minHeight:383, aspectRatio:{w:235,h:100,tolerance:.1}, spec:'900×383 ≤10MB' },
  { name:'千图网上传',  formats:['JPEG','PNG','WebP'], maxSizeBytes:50*1024*1024, minWidth:1920, spec:'宽≥1920px ≤50MB' },
  { name:'印刷输出',   formats:['TIFF','JPEG','PNG'], minDPI:300, spec:'≥300 DPI' },
  { name:'网页 Retina', formats:['WebP','PNG','JPEG'], maxSizeBytes:500*1024, minWidth:1440, spec:'宽≥1440px ≤500kB' },
];

// ============================================================
// 2. 格式检测（魔数）
// ============================================================

function detectFormat(buffer) {
  const b = new Uint8Array(buffer.slice(0,20));
  const hex16 = Array.from(b).map(x=>x.toString(16).padStart(2,'0').toUpperCase()).join(' ');
  if (b[0]===0xFF&&b[1]===0xD8&&b[2]===0xFF) return {format:'JPEG',mime:'image/jpeg',ext:'jpg',magic:hex16};
  if (b[0]===0x89&&b[1]===0x50&&b[2]===0x4E&&b[3]===0x47&&b[4]===0x0D&&b[5]===0x0A&&b[6]===0x1A&&b[7]===0x0A)
    return {format:'PNG',mime:'image/png',ext:'png',magic:hex16};
  if (b[0]===0x52&&b[1]===0x49&&b[2]===0x46&&b[3]===0x46&&b[8]===0x57&&b[9]===0x45&&b[10]===0x42&&b[11]===0x50)
    return {format:'WebP',mime:'image/webp',ext:'webp',magic:hex16};
  if (b[0]===0x47&&b[1]===0x49&&b[2]===0x46) return {format:'GIF',mime:'image/gif',ext:'gif',magic:hex16};
  if (b[0]===0x42&&b[1]===0x4D) return {format:'BMP',mime:'image/bmp',ext:'bmp',magic:hex16};
  if (b[0]===0x49&&b[1]===0x49&&b[2]===0x2A&&b[3]===0x00) return {format:'TIFF',mime:'image/tiff',ext:'tif',magic:hex16};
  if (b[0]===0x4D&&b[1]===0x4D&&b[2]===0x00&&b[3]===0x2A) return {format:'TIFF (BE)',mime:'image/tiff',ext:'tif',magic:hex16};
  if (b[4]===0x66&&b[5]===0x74&&b[6]===0x79&&b[7]===0x70) {
    const brand=String.fromCharCode(b[8],b[9],b[10],b[11]).trim();
    if (/^(heic|heis|mif1)/i.test(brand)) return {format:'HEIC',mime:'image/heic',ext:'heic',magic:hex16};
    if (/^(avif|avis)/i.test(brand)) return {format:'AVIF',mime:'image/avif',ext:'avif',magic:hex16};
  }
  return {format:'Unknown',mime:'unknown',ext:'?',magic:hex16};
}

// ============================================================
// 3. SHA-256
// ============================================================

async function sha256(buffer) {
  const h = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

// ============================================================
// 4. JPEG 解析
// ============================================================

function parseJPEGMarkers(buffer) {
  const data = new Uint8Array(buffer);
  const result = {sof:null,dqt:[],isProgressive:false,isBaseline:false};
  let offset=2;
  while (offset<data.length-3) {
    if (data[offset]!==0xFF) break;
    const marker=data[offset+1];
    if (marker===0x00||marker===0xFF){offset++;continue;}
    const segLen=(data[offset+2]<<8)|data[offset+3];
    if (marker===0xDB) {
      let pos=offset+4;
      while (pos<offset+2+segLen) {
        const qt=data[pos]; const precision=qt>>4; const id=qt&0x0F; pos++;
        const table=[];
        for (let i=0;i<64;i++) table.push(precision===0?data[pos++]:((data[pos++]<<8)|data[pos++]));
        result.dqt.push({id,precision,table});
      }
    }
    const sofMap={
      0xC0:{name:'Baseline DCT, Huffman coding',isBaseline:true},
      0xC1:{name:'Extended Sequential DCT, Huffman coding'},
      0xC2:{name:'Progressive DCT, Huffman coding',isProgressive:true},
      0xC3:{name:'Lossless, Huffman coding',isLossless:true},
      0xC9:{name:'Extended Sequential DCT, Arithmetic coding'},
      0xCA:{name:'Progressive DCT, Arithmetic coding',isProgressive:true},
    };
    if (sofMap[marker]) {
      result.sof={marker:`0xFF${marker.toString(16).toUpperCase()}`,...sofMap[marker]};
      result.isProgressive=!!sofMap[marker].isProgressive;
      result.isBaseline=!!sofMap[marker].isBaseline;
    }
    if (marker===0xDA) break;
    offset+=2+segLen;
  }
  return result;
}

function estimateJPEGQuality(lumaTable) {
  if (!lumaTable||lumaTable.length<64) return null;
  let total=0,count=0;
  for (let i=0;i<64;i++) {
    if (lumaTable[i]>0&&IJG_LUMA_STD[i]>0){total+=lumaTable[i]*100/IJG_LUMA_STD[i];count++;}
  }
  if (!count) return null;
  const s=total/count;
  return Math.round(Math.max(1,Math.min(100,s<=100?(200-s)/2:5000/s)));
}

function parseJPEGSubsampling(buffer) {
  const data=new Uint8Array(buffer);
  let offset=2;
  while (offset<data.length-3) {
    if (data[offset]!==0xFF) break;
    const marker=data[offset+1];
    const segLen=(data[offset+2]<<8)|data[offset+3];
    if ([0xC0,0xC1,0xC2].includes(marker)&&data.length>offset+15) {
      const numComp=data[offset+9];
      if (numComp>=3) {
        const h1=data[offset+11]>>4,v1=data[offset+11]&0xF;
        const h2=data[offset+14]>>4,v2=data[offset+14]&0xF;
        if (h1===1&&v1===1) return '4:4:4';
        if (h1===2&&v1===1&&h2===1) return '4:2:2';
        if (h1===2&&v1===2&&h2===1&&v2===1) return '4:2:0';
        return `${h1}/${h2}`;
      }
    }
    if (marker===0xDA) break;
    offset+=2+segLen;
  }
  return null;
}

// ============================================================
// 5. PNG / WebP 解析
// ============================================================

function parsePNGIHDR(buffer) {
  const b=new Uint8Array(buffer);
  if (b.length<29) return null;
  const view=new DataView(buffer,16,13);
  const ctMap={0:{name:'灰度',channels:1,hasAlpha:false,mode:'Grayscale'},2:{name:'RGB',channels:3,hasAlpha:false,mode:'RGB'},3:{name:'索引色',channels:1,hasAlpha:false,mode:'Indexed'},4:{name:'灰度+Alpha',channels:2,hasAlpha:true,mode:'Grayscale+Alpha'},6:{name:'RGBA',channels:4,hasAlpha:true,mode:'RGBA'}};
  const ct=b[25];
  return {width:view.getUint32(0),height:view.getUint32(4),bitDepth:b[24],colorType:ct,...(ctMap[ct]||{name:`Unknown(${ct})`,channels:0,hasAlpha:false,mode:'Unknown'}),interlaced:b[28]===1};
}

function parseWebP(buffer) {
  const b=new Uint8Array(buffer);
  if (b.length<12) return null;
  const chunkId=String.fromCharCode(b[12],b[13],b[14],b[15]);
  const result={chunkType:chunkId.trim(),compression:'Unknown',hasAlpha:false,hasICC:false,hasEXIF:false,hasXMP:false,isAnimated:false};
  if (chunkId==='VP8 ') result.compression='Lossy (VP8)';
  else if (chunkId==='VP8L'){result.compression='Lossless (VP8L)';result.hasAlpha=true;}
  else if (chunkId==='VP8X'){
    result.compression='Extended (VP8X)';
    if (b.length>=21){const f=b[20];result.hasICC=!!(f&0x20);result.hasAlpha=!!(f&0x10);result.hasEXIF=!!(f&0x08);result.hasXMP=!!(f&0x04);result.isAnimated=!!(f&0x02);}
  }
  return result;
}

// ============================================================
// 6. 图像工具
// ============================================================

async function getImageDimensions(file) {
  try {
    const img = await loadImageEl(file);
    return { width: img.naturalWidth, height: img.naturalHeight };
  } catch(e) { return null; }
}

// HEIC 检测
function isHEIC(file) {
  return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

// HEIC → JPEG Blob（需要 heic2any 库）
async function decodeHEIC(file) {
  if (typeof heic2any === 'undefined') throw new Error('浏览器不支持 HEIC 解码，请用 Safari 或先转格式');
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.95 });
  return Array.isArray(result) ? result[0] : result;
}

// Canvas 工具：加载 Image 元素（先试原生，失败再走 heic2any）
async function loadImageEl(file) {
  // 尝试原生加载（Safari 支持 HEIC；其他格式所有浏览器均支持）
  const nativeLoad = (src) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(src);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('native_fail')); };
    img.src = url;
  });
  try {
    return await nativeLoad(file);
  } catch(e) {
    // 原生失败 → 尝试 heic2any 解码（Chrome/Firefox 上的 HEIC）
    if (isHEIC(file)) {
      if (typeof heic2any === 'undefined') throw new Error('HEIC 格式需要 heic2any 库，请检查网络后刷新重试');
      const blob = await decodeHEIC(file);
      return nativeLoad(blob);
    }
    throw new Error('图片加载失败');
  }
}

// 格式转换（Canvas 重编码）
async function canvasConvert(file, mimeType, quality=0.93) {
  const img=await loadImageEl(file);
  const canvas=document.createElement('canvas');
  canvas.width=img.naturalWidth; canvas.height=img.naturalHeight;
  const ctx=canvas.getContext('2d');
  if (mimeType==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);}
  ctx.drawImage(img,0,0);
  return new Promise(r=>canvas.toBlob(r,mimeType,quality));
}

// 压缩到目标体积（二分搜索质量参数，输出 JPEG）
async function compressToSize(file, targetKB) {
  const targetBytes=targetKB*1024;
  const img=await loadImageEl(file);
  const canvas=document.createElement('canvas');
  canvas.width=img.naturalWidth; canvas.height=img.naturalHeight;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(img,0,0);
  // 先试高质量
  let blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',0.95));
  if (blob.size<=targetBytes) return {blob,quality:95,note:`已是 ${Math.round(blob.size/1024)}kB，以 Q95 输出`};
  // 二分搜索
  let lo=0.01,hi=0.95,bestBlob=null,bestQ=0.01;
  for (let i=0;i<16;i++) {
    const mid=(lo+hi)/2;
    const b=await new Promise(r=>canvas.toBlob(r,'image/jpeg',mid));
    if (b.size<=targetBytes){if(!bestBlob||b.size>bestBlob.size){bestBlob=b;bestQ=mid;}lo=mid;}
    else hi=mid;
    if (hi-lo<0.002) break;
  }
  if (!bestBlob){bestBlob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',0.01));return {blob:bestBlob,quality:1,note:`已达最低质量，${Math.round(bestBlob.size/1024)}kB`};}
  return {blob:bestBlob,quality:Math.round(bestQ*100),note:`${Math.round(bestBlob.size/1024)}kB @ Q${Math.round(bestQ*100)}`};
}

// 居中裁切并缩放到目标尺寸
async function resizeWithCenterCrop(file, targetW, targetH) {
  const img=await loadImageEl(file);
  const srcW=img.naturalWidth,srcH=img.naturalHeight;
  const targetRatio=targetW/targetH,srcRatio=srcW/srcH;
  let cropX,cropY,cropW,cropH;
  if (srcRatio>targetRatio){cropH=srcH;cropW=Math.round(srcH*targetRatio);cropX=Math.round((srcW-cropW)/2);cropY=0;}
  else{cropW=srcW;cropH=Math.round(srcW/targetRatio);cropX=0;cropY=Math.round((srcH-cropH)/2);}
  const canvas=document.createElement('canvas');
  canvas.width=targetW;canvas.height=targetH;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,targetW,targetH);
  ctx.drawImage(img,cropX,cropY,cropW,cropH,0,0,targetW,targetH);
  // HEIC/HEIF 统一输出 JPEG；PNG/WebP 保留原格式
  const mime = (file.type==='image/png') ? 'image/png'
             : (file.type==='image/webp') ? 'image/webp'
             : 'image/jpeg';
  const blob=await new Promise(r=>canvas.toBlob(r,mime,0.93));
  return blob;
}

// ============================================================
// 7. 元数据解析
// ============================================================

async function parseMetadata(file) {
  if (typeof exifr==='undefined') return {};
  try { return await exifr.parse(file,{icc:true,iptc:true,xmp:true,exif:true,gps:true,tiff:true,translateValues:true,translateKeys:true,reviveValues:true})||{}; }
  catch(e){ return {}; }
}

async function reverseGeocode(lat, lon) {
  try {
    const res=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,{headers:{'Accept-Language':'zh-CN,zh;q=0.9'}});
    const data=await res.json();
    return data.display_name||null;
  } catch(e){return null;}
}

// ============================================================
// 8. 维度分析器
// ============================================================

function analyzeDim1(ctx) {
  const {file,format,sha,jpegInfo,webpInfo}=ctx;
  const ext=(file.name.split('.').pop()||'').toLowerCase();
  const realExt=format.ext;
  const extMatch=ext===realExt||(ext==='jpg'&&realExt==='jpg')||(ext==='jpeg'&&realExt==='jpg')||(ext==='tiff'&&realExt==='tif');
  const mismatch=!extMatch&&format.format!=='Unknown';
  let encodingProcess='—';
  if (format.format==='JPEG'&&jpegInfo?.sof) encodingProcess=jpegInfo.sof.name;
  else if (format.format==='PNG') encodingProcess='Deflate（无损）';
  else if (format.format==='WebP') encodingProcess=webpInfo?.compression||'—';
  else if (format.format==='GIF') encodingProcess='LZW（无损）';
  return {mismatch,declaredExt:ext,realFormat:format.format,realExt,mime:format.mime,magic:format.magic,encodingProcess,isProgressive:jpegInfo?.isProgressive||false,sha,fileSize:file.size};
}

function analyzeDim2(ctx) {
  const {file,dims,meta,format,jpegInfo,pngInfo,webpInfo}=ctx;
  const w=dims?.width||0,h=dims?.height||0;
  const mp=w&&h?(w*h/1000000).toFixed(2):null;
  const gcd=(a,b)=>b?gcd(b,a%b):a; const g=gcd(w,h);
  const ratio=w&&h?`${w/g}:${h/g}`:'—';
  const dpi=meta?.XResolution?Math.round(meta.XResolution):null;
  let physW=null,physH=null;
  if (dpi&&dpi>1&&w&&h){physW=(w/dpi*2.54).toFixed(1);physH=(h/dpi*2.54).toFixed(1);}
  let colorMode='—';
  if (format.format==='JPEG') colorMode='YCbCr（显示时转 RGB）';
  else if (format.format==='PNG'&&pngInfo) colorMode=pngInfo.mode;
  else if (format.format==='WebP') colorMode=webpInfo?.hasAlpha?'RGBA':'RGB';
  else if (format.format==='GIF') colorMode='索引色（最多256色）';
  let bitDepth='8-bit / 通道';
  if (format.format==='PNG'&&pngInfo) bitDepth=`${pngInfo.bitDepth}-bit / 通道`;
  let channels=3;
  if (format.format==='PNG'&&pngInfo) channels=pngInfo.channels;
  else if (format.format==='WebP'&&webpInfo?.hasAlpha) channels=4;
  const hasAlpha=(format.format==='PNG'&&pngInfo?.hasAlpha)||(format.format==='WebP'&&webpInfo?.hasAlpha);
  const colorGamut=meta?.ProfileDescription||'未知';
  const iccCopyright=meta?.ProfileCopyright||null;
  let subsampling=null;
  if (format.format==='JPEG') subsampling=ctx.jpegSubsampling||'—';
  let jpegQuality=null;
  if (format.format==='JPEG'&&jpegInfo?.dqt?.length){const luma=jpegInfo.dqt.find(t=>t.id===0);if(luma)jpegQuality=estimateJPEGQuality(luma.table);}
  const screenOK=w>=1080,printOK=dpi?dpi>=300:false,retinaOK=w>=2560&&h>=1440;
  return {width:w,height:h,mp,ratio,dpi,physW,physH,colorMode,bitDepth,channels,hasAlpha,colorGamut,iccCopyright,subsampling,jpegQuality,screenOK,printOK,retinaOK,interlaced:format.format==='PNG'?(pngInfo?.interlaced||false):null,fileSize:file.size};
}

async function analyzeDim3(ctx) {
  const {meta,geoLocation}=ctx;
  const camera={make:meta?.Make||null,model:meta?.Model||null,lens:meta?.LensModel||meta?.LensMake||null,software:meta?.Software||null};
  const shooting={dateTime:meta?.DateTimeOriginal||meta?.DateTime||null,shutterSpeed:meta?.ExposureTime?`1/${Math.round(1/meta.ExposureTime)}s`:null,aperture:meta?.FNumber?`f/${meta.FNumber}`:null,iso:meta?.ISO||meta?.ISOSpeedRatings||null,focalLength:meta?.FocalLength?`${meta.FocalLength}mm`:null,exposureMode:meta?.ExposureMode||null,whiteBalance:meta?.WhiteBalance||null,flash:meta?.Flash||null};
  const gps={lat:meta?.latitude||meta?.GPSLatitude||null,lon:meta?.longitude||meta?.GPSLongitude||null,altitude:meta?.GPSAltitude?`${Math.round(meta.GPSAltitude)}m`:null,location:geoLocation||null};
  const copyright={rights:meta?.Copyright||meta?.Rights||null,creator:meta?.Artist||meta?.Creator||meta?.ByLine||null,description:meta?.ImageDescription||meta?.Description||null,keywords:meta?.Keywords||null,dateCreated:meta?.DateCreated||null,source:meta?.Source||null};
  const hasEXIF=!!(camera.make||shooting.dateTime),hasIPTC=!!(copyright.creator||copyright.rights),hasXMP=!!(meta?.CreatorTool),hasICC=!!(meta?.ProfileDescription);
  let completeness;
  if (hasEXIF&&hasIPTC) completeness={level:'full',label:'完整',color:'ok'};
  else if (hasEXIF) completeness={level:'exif',label:'仅 EXIF',color:'warn'};
  else if (hasIPTC) completeness={level:'iptc',label:'仅 IPTC',color:'warn'};
  else if (hasICC) completeness={level:'icc',label:'仅 ICC',color:'warn'};
  else completeness={level:'none',label:'来源不可追溯',color:'danger'};
  return {camera,shooting,gps,copyright,completeness,hasEXIF,hasIPTC,hasXMP};
}

// AI 检测打分 — 与 skill/AI-DETECTION-GUIDE.md 阈值同步
// 阈值：0-2分=低可能性  3-5分=疑似AI  ≥6分=高可能性
function analyzeDim4(ctx) {
  const {file,dims,dim3,meta}=ctx;
  const signals=[];let aiScore=0;

  // 5分：决定性证据 — CreatorTool 明确含 AI 工具名
  const creatorTool=meta?.CreatorTool||meta?.Software||null;
  const aiToolDetected=creatorTool&&['stable diffusion','midjourney','dall-e','comfyui','invokeai','firefly','imagen','gemini','flux','ideogram','novelai','leonardo'].some(k=>creatorTool.toLowerCase().includes(k));
  signals.push({label:'XMP/EXIF 标注 AI 工具',detail:aiToolDetected?`检测到: ${creatorTool}`:(creatorTool?`工具: ${creatorTool}`:'无工具信息'),positive:aiToolDetected,weight:5});
  if (aiToolDetected) aiScore+=5;

  // 3分：强支撑 — UUID文件名 + AI常见分辨率同时命中
  const isUUID=UUID_REGEX.test(file.name);
  const resKey=`${dims?.width}x${dims?.height}`;
  const aiRes=AI_RESOLUTIONS.has(resKey);
  const uuidAndAiRes=isUUID&&aiRes;
  signals.push({label:'UUID 文件名 + AI 常见分辨率',detail:uuidAndAiRes?`UUID文件名 + ${resKey} 为 AI 常见输出尺寸`:(isUUID?`文件名含 UUID（${file.name}）`:(aiRes?`${resKey} 为 AI 常见分辨率`:'不命中')),positive:uuidAndAiRes,weight:3});
  if (uuidAndAiRes) aiScore+=3;

  // 2分：辅助信号 — 完全无 EXIF
  const noEXIF=!dim3.hasEXIF;
  signals.push({label:'无拍摄 EXIF 信息',detail:noEXIF?'真实相机拍摄通常含设备和时间信息':`相机: ${dim3.camera.make||''} ${dim3.camera.model||''}`,positive:noEXIF,weight:2});
  if (noEXIF) aiScore+=2;

  // 2分：辅助信号 — ICC Profile 来自 Google（Imagen/Gemini 特征）
  const iccGoogle=!!(meta?.ProfileCopyright||'').toLowerCase().includes('google');
  signals.push({label:'ICC Profile 来自 Google Inc.',detail:iccGoogle?`ICC: ${meta?.ProfileDescription||'sRGB'} (${meta?.ProfileCopyright})，Gemini/Imagen 特征`:(meta?.ProfileDescription?`ICC: ${meta.ProfileDescription}`:'无 ICC Profile'),positive:iccGoogle,weight:2});
  if (iccGoogle) aiScore+=2;

  // 1分：弱信号 — 单独 UUID 文件名（未配合 AI 分辨率）
  if (!uuidAndAiRes&&isUUID) {
    signals.push({label:'文件名含 UUID 特征',detail:`${file.name}，常见于 AI 平台自动命名`,positive:true,weight:1});
    aiScore+=1;
  }

  // 1分：弱信号 — 分辨率为 AI 常见尺寸（未配合 UUID）
  if (!uuidAndAiRes&&aiRes) {
    signals.push({label:'分辨率为 AI 常见尺寸',detail:`${resKey} 在已知 AI 输出分辨率列表中`,positive:true,weight:1});
    aiScore+=1;
  }

  // 1分：弱信号 — 扩展名伪装
  const mismatch=ctx.dim1?.mismatch;
  signals.push({label:'文件扩展名与真实格式不一致',detail:mismatch?`扩展名伪装，AI 平台下载常见此情况`:'扩展名与真实格式一致',positive:!!mismatch,weight:1});
  if (mismatch) aiScore+=1;

  // 平台推断
  let platform=null;
  if (aiToolDetected) platform=creatorTool;
  else if (iccGoogle) platform='Gemini / Imagen（Google）';
  else if (isUUID&&(resKey==='1024x1024'||resKey==='1024x1792')) platform='DALL-E 3（OpenAI）';
  else if (aiRes) platform='Stable Diffusion / Flux / ComfyUI 系列';

  // 阈值判定（与 AI-DETECTION-GUIDE.md 同步：0-2低 3-5疑似 ≥6高）
  let verdict;
  if (aiScore>=6) verdict={label:'AI 生成可能性：高',color:'danger',score:aiScore};
  else if (aiScore>=3) verdict={label:'AI 生成可能性：中（疑似）',color:'warn',score:aiScore};
  else verdict={label:'AI 生成可能性：低',color:'ok',score:aiScore};

  const maxScore=signals.reduce((s,g)=>s+g.weight,0);
  const pct=aiScore/maxScore;
  verdict.pct=pct;
  return {signals,verdict,platform,aiScore,maxScore};
}

function analyzeDim6(ctx) {
  const {file, meta} = ctx;
  // 聚合所有文本字段
  const kw = meta?.Keywords;
  const allText = [
    file.name,
    meta?.ImageDescription, meta?.Description, meta?.Title,
    meta?.Subject, meta?.Caption,
    Array.isArray(kw) ? kw.join(' ') : kw,
    meta?.Software, meta?.CreatorTool,
    meta?.Creator, meta?.Artist, meta?.Copyright, meta?.Rights,
    meta?.Source, meta?.Label, meta?.Instructions,
    // XMP/IPTC extended
    meta?.['xmp:Label'], meta?.['xmp:Description'],
    meta?.['iptc:Caption'], meta?.['iptc:Keywords'],
    meta?.['Exif IFD0:ImageDescription'],
  ].filter(Boolean).join(' ').toLowerCase();

  const hits = [];
  for (const [catKey, cat] of Object.entries(BRAND_DB)) {
    const matched = cat.keywords.filter(k => allText.includes(k));
    if (matched.length) {
      hits.push({
        catKey, label: cat.label, risk: cat.risk, color: cat.color,
        matched: [...new Set(matched)].slice(0, 5), // 最多展示5个
        source: buildSources(file.name, meta, matched),
      });
    }
  }

  const totalRisk = hits.some(h => h.risk === 'high') ? 'high'
                  : hits.some(h => h.risk === 'medium') ? 'medium' : 'none';
  const verdict = {
    high:   { label: '高风险 — 发现知名品牌/IP 关键词', color: 'danger' },
    medium: { label: '中风险 — 发现商业品牌关键词', color: 'warn' },
    none:   { label: '未发现已知品牌 / IP 关键词', color: 'ok' },
  }[totalRisk];

  return { hits, verdict, totalRisk, scannedFields: allText.length };
}

function buildSources(filename, meta, matched) {
  const src = [];
  const fn = filename.toLowerCase();
  if (matched.some(k => fn.includes(k))) src.push('文件名');
  const metaStr = [meta?.ImageDescription, meta?.Keywords, meta?.Title, meta?.Description].filter(Boolean).join(' ').toLowerCase();
  if (matched.some(k => metaStr.includes(k))) src.push('元数据/IPTC');
  const xmpStr = [meta?.CreatorTool, meta?.Software, meta?.['xmp:Description']].filter(Boolean).join(' ').toLowerCase();
  if (matched.some(k => xmpStr.includes(k))) src.push('XMP/软件标注');
  return src.length ? src.join('、') : '文件名';
}

function analyzeDim5(ctx) {
  const {file,format,dims}=ctx;
  const {width:w,height:h}=dims||{};
  const dpi=ctx.dim2?.dpi||null;
  const results=PLATFORMS.map(p=>{
    const reasons=[];let pass=true;
    if (!p.formats.includes(format.format)){pass=false;reasons.push(`格式 ${format.format} 不符（需 ${p.formats.join('/')}）`);}
    if (p.maxSizeBytes&&file.size>p.maxSizeBytes){pass=false;reasons.push(`${formatBytes(file.size)} 超过 ${formatBytes(p.maxSizeBytes)}`);}
    if (p.minWidth&&w<p.minWidth){pass=false;reasons.push(`宽 ${w}px < ${p.minWidth}px`);}
    if (p.minHeight&&h<p.minHeight){pass=false;reasons.push(`高 ${h}px < ${p.minHeight}px`);}
    if (p.aspectRatio&&w&&h){const actual=w/h,target=p.aspectRatio.w/p.aspectRatio.h;if(Math.abs(actual-target)/target>p.aspectRatio.tolerance){pass=false;reasons.push(`宽高比 ${actual.toFixed(2)} 偏离目标 ${target.toFixed(2)}`);}}
    if (p.minDPI){if(!dpi||dpi<p.minDPI){pass=false;reasons.push(`DPI ${dpi||'未知'} < ${p.minDPI}`);}}
    return {...p,pass,reasons};
  });
  return {results};
}

// ============================================================
// 9. 综合分析入口
// ============================================================

async function analyzeFile(file) {
  const buffer=await file.arrayBuffer();
  const [format,hashVal,dims,meta]=await Promise.all([
    Promise.resolve(detectFormat(buffer)),sha256(buffer),getImageDimensions(file),parseMetadata(file),
  ]);
  let jpegInfo=null,jpegSubsampling=null,pngInfo=null,webpInfo=null;
  if (format.format==='JPEG'){jpegInfo=parseJPEGMarkers(buffer);jpegSubsampling=parseJPEGSubsampling(buffer);}
  else if (format.format==='PNG') pngInfo=parsePNGIHDR(buffer);
  else if (format.format==='WebP') webpInfo=parseWebP(buffer);
  const ctx={file,format,sha:hashVal,dims,meta,jpegInfo,jpegSubsampling,pngInfo,webpInfo};
  let geoLocation=null;
  if (meta?.latitude&&meta?.longitude) geoLocation=await reverseGeocode(meta.latitude,meta.longitude).catch(()=>null);
  ctx.geoLocation=geoLocation;
  const dim1=analyzeDim1(ctx);ctx.dim1=dim1;
  const dim2=analyzeDim2(ctx);ctx.dim2=dim2;
  const dim3=await analyzeDim3(ctx);ctx.dim3=dim3;
  const dim4=analyzeDim4(ctx);
  const dim5=analyzeDim5(ctx);
  const dim6=analyzeDim6(ctx);
  // HEIC 文件需要解码后才能在非 Safari 浏览器中显示缩略图
  let thumbURL;
  if (isHEIC(file)) {
    try {
      // 生成解码后的 data URL（走 canvas，所有浏览器均支持）
      thumbURL = await thumbToDataURL(file, 80);
    } catch(e) { thumbURL = null; }
  } else {
    thumbURL = URL.createObjectURL(file);
  }
  return {file,format,sha:hashVal,dims,meta,dim1,dim2,dim3,dim4,dim5,dim6,thumbURL};
}

// ============================================================
// 10. 工具函数
// ============================================================

function formatBytes(n){if(n<1024)return`${n} B`;if(n<1024*1024)return`${(n/1024).toFixed(1)} kB`;return`${(n/1024/1024).toFixed(2)} MB`;}
function escapeHtml(s){if(s==null)return'—';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function badge(text,type='muted'){return`<span class="badge badge-${type}">${escapeHtml(text)}</span>`;}
function setStatus(id,msg,isError=false){const el=document.getElementById(id);if(el){el.textContent=msg;el.className='action-status'+(isError?' error':'');}}

// ============================================================
// 11. UI 渲染
// ============================================================

function renderSummary(r) {
  const {dim1,dim2,dim3,dim4}=r;
  const fmtColor=dim1.mismatch?'tag-danger':'tag-info';
  const extColor=dim1.mismatch?'tag-danger':'tag-ok';
  const metaColor={full:'tag-ok',exif:'tag-warn',iptc:'tag-warn',icc:'tag-warn',none:'tag-danger'}[dim3.completeness.level];
  const aiColor={ok:'tag-ok',warn:'tag-warn',danger:'tag-danger'}[dim4.verdict.color];
  return `
    <div class="summary-title">取证摘要</div>
    <div class="summary-top">
      ${r.thumbURL
        ? `<img class="summary-thumb" src="${r.thumbURL}" alt="缩略图" onerror="this.style.opacity='.3'">`
        : `<div class="summary-thumb" style="display:flex;align-items:center;justify-content:center;font-size:22px;color:var(--text-3);">🖼</div>`}
        <div class="summary-file-info">
        <div class="summary-file-name">${escapeHtml(r.file.name)}</div>
        <div class="summary-file-sub">${formatBytes(r.file.size)} &nbsp;·&nbsp; ${dim2.width}×${dim2.height}px &nbsp;·&nbsp; ${dim2.mp||'?'}MP</div>
        <div style="margin-top:6px;display:flex;gap:6px;">
          <button class="copy-btn copy-img-btn" onclick="App.copyImageToClipboard(this)" title="复制图片到剪贴板，可直接粘贴到 AI 对话框">复制图片</button>
        </div>
      </div>
    </div>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="s-label">真实格式</div>
        <div class="s-value ${fmtColor}">${dim1.realFormat}</div>
        <div class="s-note">${dim1.mime}</div>
      </div>
      <div class="summary-item">
        <div class="s-label">文件扩展名</div>
        <div class="s-value ${extColor}">.${dim1.declaredExt}</div>
        <div class="s-note">声明格式</div>
      </div>
      <div class="summary-item">
        <div class="s-label">扩展名一致性</div>
        <div class="s-value ${dim1.mismatch?'tag-danger':'tag-ok'}">${dim1.mismatch?'不一致 !':'一致'}</div>
        <div class="s-note">${dim1.mismatch?'高风险':'通过'}</div>
      </div>
      <div class="summary-item">
        <div class="s-label">元数据状态</div>
        <div class="s-value ${metaColor}">${dim3.completeness.label}</div>
        <div class="s-note">${dim3.hasEXIF?'EXIF':''} ${dim3.hasIPTC?'IPTC':''} ${dim3.hasXMP?'XMP':'—'}</div>
      </div>
      <div class="summary-item">
        <div class="s-label">AI 可能性</div>
        <div class="s-value ${aiColor}">${dim4.verdict.label.replace('AI 生成可能性：','')}</div>
        <div class="s-note">${dim4.aiScore}/${dim4.maxScore} 信号</div>
      </div>
      <div class="summary-item">
        <div class="s-label">版权风险</div>
        ${(()=>{const d6=r.dim6;if(!d6)return'<div class="s-value tag-muted">—</div>';const c={high:'tag-danger',medium:'tag-warn',none:'tag-ok'}[d6.totalRisk];return`<div class="s-value ${c}">${d6.totalRisk==='high'?'高风险':d6.totalRisk==='medium'?'中风险':'无命中'}</div><div class="s-note">${d6.hits.length?d6.hits.map(h=>h.label).join('、'):'元数据扫描通过'}</div>`;})()}
      </div>
    </div>`;
}

function renderAlerts(r) {
  const alerts=[];
  if (r.dim1.mismatch) alerts.push(`扩展名 .${r.dim1.declaredExt} 与真实格式 ${r.dim1.realFormat} 不一致，存在伪装风险`);
  if (!r.dim3.hasEXIF&&!r.dim3.hasIPTC) alerts.push('图片无任何来源元数据，无法追溯拍摄设备或版权信息');
  if (r.dim4.verdict.color==='danger') alerts.push(`AI 生成可能性高（命中 ${r.dim4.aiScore}/${r.dim4.maxScore} 信号）`);
  if (!alerts.length) return '';
  const level=r.dim1.mismatch||r.dim4.verdict.color==='danger'?'danger':'warning';
  return`<div class="alert-banner ${level}"><div class="alert-title">${level==='danger'?'高危告警':'注意'}</div><ul>${alerts.map(a=>`<li>${a}</li>`).join('')}</ul></div>`;
}

function renderDim1(d, file) {
  const hexRows=d.magic.split(' ').map((b,i)=>`<span class="hex-byte ${i<3?'magic':i<6?'jfif':''}">${b}</span>`).join(' ');
  const rows=[
    {k:'真实格式',cn:'Format',v:`${d.realFormat} ${badge(d.mime,'info')}`},
    {k:'文件扩展名',cn:'Extension',v:`.${d.declaredExt}`},
    {k:'扩展名一致性',cn:'Consistency',v:d.mismatch?badge('不一致 — 扩展名伪装风险','danger'):badge('一致','ok')},
    {k:'编码方式',cn:'Encoding Process',v:escapeHtml(d.encodingProcess)},
    {k:'是否渐进式',cn:'Progressive',v:d.isProgressive===null?'—':(d.isProgressive?badge('是 Progressive','info'):badge('否 Baseline','muted'))},
    {k:'文件大小',cn:'File Size',v:`${formatBytes(d.fileSize)} (${d.fileSize.toLocaleString()} bytes)`},
    {k:'文件头（魔数）',cn:'Magic Bytes',v:`<div class="hex-view">${hexRows}</div>`},
    {k:'SHA-256 指纹',cn:'Checksum',v:`<div class="sha-block">${escapeHtml(d.sha)}<button class="copy-btn" onclick="App.copyText('${d.sha}','shacopybtn')" id="shacopybtn" title="复制">复制</button></div>`},
  ];
  const presetHtml=SIZE_PRESETS.map(p=>{
    const BOX_H=18, MAX_W=48;
    const ratio=p.w/p.h;
    let bw=Math.round(BOX_H*ratio), bh=BOX_H;
    if(bw>MAX_W){bh=Math.round(BOX_H*MAX_W/bw);bw=MAX_W;}
    const ratioBox=`<span class="preset-ratio-box" style="width:${bw}px;height:${bh}px"></span>`;
    return `<button class="preset-btn${p.targetKB?' preset-qiantu':''}" onclick="App.selectPreset(${p.w},${p.h},${p.targetKB||'null'},this)">${ratioBox}${escapeHtml(p.label)}<span class="preset-size">${p.w}×${p.h}${p.targetKB?` ≤${p.targetKB}kB`:' '+p.note}</span></button>`;
  }).join('');
  const suggestTarget=Math.max(50,Math.round(file.size/1024/2));
  return`
    <table class="param-table two-col"><tbody>${rows.map(r=>`<tr><td class="td-key">${r.k}<span class="td-en">${r.cn}</span></td><td class="td-val">${r.v}</td></tr>`).join('')}</tbody></table>
    <div class="action-panel">
      <div class="action-panel-title">格式转换（真实重编码）</div>
      <div class="action-row">
        <span class="action-label">一键转换并下载</span>
        <button class="action-btn" onclick="App.convertFormat('image/jpeg')">转为 JPEG</button>
        <button class="action-btn" onclick="App.convertFormat('image/png')">转为 PNG</button>
        <button class="action-btn" onclick="App.convertFormat('image/webp')">转为 WebP</button>
        <span class="action-status" id="convertStatus"></span>
      </div>
    </div>
    <div class="action-panel">
      <div class="action-panel-title">尺寸调整（居中裁切）</div>
      <div class="preset-grid">${presetHtml}</div>
      <div class="action-row action-row-resize">
        <span class="action-label">宽</span>
        <input class="action-input" id="resizeW" type="number" placeholder="px" style="width:64px">
        <span class="action-label">×</span>
        <input class="action-input" id="resizeH" type="number" placeholder="px" style="width:64px">
        <button class="action-btn" onclick="App.resizeCustom()" style="margin-left:2px;">裁切</button>
        <span class="action-row-divider">|</span>
        <span class="action-label">压缩至</span>
        <input class="action-input" id="cropCompressKB" type="number" placeholder="kB" style="width:88px" min="5" step="10">
        <span class="action-label">kB</span>
        <button class="action-btn action-btn-combo" onclick="App.cropAndCompress()">裁切压缩</button>
      </div>
      <div class="action-row" style="margin-top:2px;">
        <span class="action-status" id="resizeStatus" style="flex:1"></span>
        <span class="action-status" id="cropCompressStatus" style="flex:1"></span>
      </div>
    </div>
    <div class="action-panel">
      <div class="action-panel-title">体积压缩（输出 JPEG）</div>
      <div class="action-row">
        <span class="action-label">压缩到</span>
        <input class="action-input" id="compressTargetKB" type="number" value="${suggestTarget}" min="10" step="50">
        <span class="action-label">kB 以内</span>
        <button class="action-btn" onclick="App.compressImage()">压缩并下载</button>
        <span class="action-status" id="compressStatus"></span>
      </div>
    </div>`;
}

function renderDim2(d, file) {
  const qualityHtml=d.jpegQuality!==null?`
    <div class="quality-gauge">
      <div class="quality-track"><div class="quality-fill ${d.jpegQuality>=80?'high':d.jpegQuality>=50?'mid':'low'}" style="width:${d.jpegQuality}%"></div></div>
      <div class="quality-num ${d.jpegQuality>=80?'tag-ok':d.jpegQuality>=50?'tag-warn':'tag-danger'}">${d.jpegQuality}</div>
    </div>
    <div class="info-notice">IJG 标准量化表估算，第三方编码器可能有误差</div>`:'—（非 JPEG）';
  const rows=[
    {k:'分辨率',cn:'Resolution',v:`${d.width} × ${d.height} px`},
    {k:'总像素',cn:'Megapixels',v:d.mp?`${d.mp} MP`:'—'},
    {k:'宽高比',cn:'Aspect Ratio',v:d.ratio},
    {k:'DPI / PPI',cn:'Dots Per Inch',v:d.dpi?`${d.dpi} DPI`:'—（JFIF 无物理单位）'},
    {k:'物理尺寸',cn:'Physical Size',v:d.physW?`${d.physW} × ${d.physH} cm`:'—'},
    {k:'色彩模式',cn:'Color Mode',v:escapeHtml(d.colorMode)},
    {k:'位深',cn:'Bit Depth',v:d.bitDepth},
    {k:'通道数',cn:'Channels',v:`${d.channels} 通道`},
    {k:'透明通道',cn:'Has Alpha',v:d.hasAlpha?badge('有','ok'):badge('无','muted')},
    {k:'色域 / ICC',cn:'Color Gamut',v:escapeHtml(d.colorGamut)+(d.iccCopyright?` <span style="color:var(--text-3);font-size:11px;">(${escapeHtml(d.iccCopyright)})</span>`:'')},
    {k:'色度子采样',cn:'Chroma Subsampling',v:escapeHtml(d.subsampling||'—')},
    {k:'JPEG 质量估算',cn:'Quality Estimate',v:qualityHtml},
  ];
  const ratingRows=[
    {k:'适合屏幕显示',cn:'Screen',v:d.screenOK?badge('通过 (宽≥1080px)','ok'):badge('不足','warn')},
    {k:'适合印刷输出',cn:'Print',v:d.printOK?badge('通过 (≥300 DPI)','ok'):badge('不确定','warn')},
    {k:'适合 4K 全屏',cn:'4K',v:d.retinaOK?badge('通过','ok'):badge('分辨率不足 4K','warn')},
  ];
  return`
    <div class="param-section-head">基础参数</div>
    <table class="param-table two-col"><tbody>${rows.map(r=>`<tr><td class="td-key">${r.k}<span class="td-en">${r.cn}</span></td><td class="td-val">${r.v}</td></tr>`).join('')}</tbody></table>
    <div class="param-section-head">质量评级</div>
    <table class="param-table two-col"><tbody>${ratingRows.map(r=>`<tr><td class="td-key">${r.k}<span class="td-en">${r.cn}</span></td><td class="td-val">${r.v}</td></tr>`).join('')}</tbody></table>`;
}

function renderDim3(d) {
  const r2h=rows=>rows.map(r=>`<tr><td class="td-key">${r.k}<span class="td-en">${r.cn}</span></td><td class="td-val">${escapeHtml(r.v)}</td></tr>`).join('');
  const cam=[{k:'相机品牌',cn:'Make',v:d.camera.make},{k:'相机型号',cn:'Model',v:d.camera.model},{k:'镜头',cn:'Lens',v:d.camera.lens},{k:'处理软件',cn:'Software',v:d.camera.software}];
  const shoot=[{k:'拍摄时间',cn:'Date/Time',v:d.shooting.dateTime?new Date(d.shooting.dateTime).toLocaleString('zh-CN'):null},{k:'快门',cn:'Shutter',v:d.shooting.shutterSpeed},{k:'光圈',cn:'Aperture',v:d.shooting.aperture},{k:'ISO',cn:'ISO',v:d.shooting.iso},{k:'焦距',cn:'Focal Length',v:d.shooting.focalLength},{k:'白平衡',cn:'White Balance',v:d.shooting.whiteBalance},{k:'闪光灯',cn:'Flash',v:d.shooting.flash}];
  const gps=[{k:'GPS 纬度',cn:'Latitude',v:d.gps.lat?d.gps.lat.toFixed(6):null},{k:'GPS 经度',cn:'Longitude',v:d.gps.lon?d.gps.lon.toFixed(6):null},{k:'海拔',cn:'Altitude',v:d.gps.altitude},{k:'地理位置',cn:'Location',v:d.gps.location}];
  const cr=[{k:'版权声明',cn:'Copyright',v:d.copyright.rights},{k:'创作者',cn:'Creator',v:d.copyright.creator},{k:'图片描述',cn:'Description',v:d.copyright.description},{k:'关键词',cn:'Keywords',v:Array.isArray(d.copyright.keywords)?d.copyright.keywords.join(', '):d.copyright.keywords},{k:'创作日期',cn:'Date Created',v:d.copyright.dateCreated}];
  const comColor={full:'ok',exif:'warn',iptc:'warn',icc:'warn',none:'danger'}[d.completeness.level];
  return`
    <div class="param-section-head" style="display:flex;align-items:center;justify-content:space-between;">
      完整性评级
      <span style="font-size:11px;color:var(--text-3);font-weight:400;letter-spacing:0;">
        ${d.hasEXIF?'EXIF ✓':'EXIF —'} &nbsp;${d.hasIPTC?'IPTC ✓':'IPTC —'} &nbsp;${d.hasXMP?'XMP ✓':'XMP —'}
      </span>
    </div>
    <div style="padding:10px 14px 12px;">${badge(d.completeness.label,comColor)}</div>
    <div class="dim3-grid">
      <div class="dim3-col">
        <div class="param-section-head">拍摄设备</div>
        <table class="param-table two-col"><tbody>${r2h(cam)}</tbody></table>
        <div class="param-section-head">拍摄参数</div>
        <table class="param-table two-col"><tbody>${r2h(shoot)}</tbody></table>
      </div>
      <div class="dim3-col">
        <div class="param-section-head">GPS 位置</div>
        <table class="param-table two-col"><tbody>${r2h(gps)}</tbody></table>
        <div class="param-section-head">版权信息（IPTC）</div>
        <table class="param-table two-col"><tbody>${r2h(cr)}</tbody></table>
      </div>
    </div>`;
}

function renderDim4(d) {
  const signals=d.signals.map(s=>`
    <div class="ai-signal ${s.positive?'positive':'negative'}">
      <div class="sig-dot"></div>
      <div><div class="sig-label">${escapeHtml(s.label)}</div><div class="sig-detail">${escapeHtml(s.detail)}</div></div>
    </div>`).join('');
  const gaugeW=Math.round(d.aiScore/d.maxScore*100);
  const gaugeColor={ok:'var(--success)',warn:'var(--warning)',danger:'var(--danger)'}[d.verdict.color];
  const verdictColor={ok:'tag-ok',warn:'tag-warn',danger:'tag-danger'}[d.verdict.color];
  return`
    <div class="ai-verdict">
      <div class="ai-verdict-label">综合评定</div>
      <div class="quality-gauge" style="margin-top:8px;">
        <div class="quality-track"><div class="quality-fill" style="width:${gaugeW}%;background:${gaugeColor}"></div></div>
        <div class="quality-num ${verdictColor}">${gaugeW}%</div>
      </div>
      <div class="ai-verdict-value ${verdictColor}" style="margin-top:8px;">${escapeHtml(d.verdict.label)}</div>
      ${d.platform?`<div class="ai-verdict-note">推断来源平台：${escapeHtml(d.platform)}</div>`:''}
      <div class="ai-verdict-note" style="color:var(--warning);">启发式分析，不能作为绝对判断依据</div>
    </div>
    <div class="param-section-head" style="margin-top:14px;">信号详情</div>
    <div class="ai-signals">${signals}</div>`;
}

function renderDim5(d) {
  const items=d.results.map(p=>`
    <div class="platform-item ${p.pass?'pass':'fail'}">
      <div class="platform-item-header">
        <span class="platform-item-name">${p.name}</span>
        <span class="${p.pass?'pass-icon':'fail-icon'}">${p.pass?'通过':'不符'}</span>
      </div>
      <div class="platform-item-spec">${p.spec}</div>
      ${p.reasons.length?`<div class="platform-item-reason">${p.reasons.join('；')}</div>`:''}
    </div>`).join('');
  return`<div class="platform-grid">${items}</div>`;
}

function renderDim6(d) {
  const verdictColor = { high:'danger', medium:'warn', none:'ok' }[d.totalRisk];
  const gaugeW = d.totalRisk === 'high' ? 90 : d.totalRisk === 'medium' ? 45 : 5;
  const gaugeColor = { danger:'var(--danger)', warn:'var(--warning)', ok:'var(--success)' }[verdictColor];

  const hitsHtml = d.hits.length ? d.hits.map(h => `
    <div class="brand-hit-card risk-${h.color}">
      <div class="brand-hit-header">
        <span class="brand-hit-label">${h.label}</span>
        ${badge(h.risk === 'high' ? '高风险' : '中风险', h.color)}
      </div>
      <div class="brand-hit-keywords">${h.matched.map(k=>`<span class="brand-kw">${escapeHtml(k)}</span>`).join('')}</div>
      <div class="brand-hit-source">发现于：${h.source}</div>
    </div>`).join('') :
    `<div class="brand-empty">
      <span style="font-size:28px;">✓</span>
      <div>未在文件名及元数据中发现已知品牌 / IP 关键词</div>
    </div>`;

  return `
    <div class="brand-verdict">
      <div class="ai-verdict-label">风险评级</div>
      <div class="quality-gauge" style="margin-top:8px;">
        <div class="quality-track"><div class="quality-fill" style="width:${gaugeW}%;background:${gaugeColor}"></div></div>
        <div class="quality-num tag-${verdictColor}">${gaugeW}%</div>
      </div>
      <div class="ai-verdict-value tag-${verdictColor}" style="margin-top:8px;">${d.verdict.label}</div>
      <div class="ai-verdict-note" style="color:var(--warning);">
        仅扫描文件名与元数据关键词，不分析图像像素内容。漏检/误报均有可能，不构成法律意见。
      </div>
    </div>
    ${d.hits.length ? `<div class="param-section-head" style="margin-top:14px;">命中详情（共 ${d.hits.length} 类）</div>` : ''}
    <div class="brand-hits-grid">${hitsHtml}</div>
    <div class="brand-disclaimer">
      <strong>⚠ 注意</strong>：图像中含有知名品牌/IP 元素可能涉及商标权、著作权侵权。
      商业用途前请确认版权归属，或选用已获授权素材。
      如需像素级 IP 检测，可接入 Google Vision API 或 AWS Rekognition。
    </div>`;
}

function renderDimensions(r) {
  const allDims={
    d1:{id:'dim-1',num:1,cls:'d1',title:'格式取证',sub:'Format Forensics · 魔数 / 编码 / 格式转换 / 尺寸调整',
     status:r.dim1.mismatch?badge('扩展名伪装 !','danger'):badge('格式正常','ok'),
     content:renderDim1(r.dim1,r.file)},
    d4:{id:'dim-4',num:2,cls:'d4',title:'AI 生成检测',sub:'AI Origin Detection · 启发式多信号分析',
     status:badge(r.dim4.verdict.label.replace('AI 生成可能性：','AI '),r.dim4.verdict.color),
     content:renderDim4(r.dim4)},
    d6:{id:'dim-6',num:3,cls:'d6',title:'品牌 / IP 版权风险',sub:'Copyright Risk · 知名品牌 & 卡通 IP 关键词扫描',
     status:(()=>{const c={high:'danger',medium:'warn',none:'ok'}[r.dim6?.totalRisk||'none'];return badge(r.dim6?.totalRisk==='high'?'高风险':r.dim6?.totalRisk==='medium'?'中风险':'无命中',c);})(),
     content:r.dim6?renderDim6(r.dim6):''},
    d2:{id:'dim-2',num:4,cls:'d2',title:'显示质量',sub:'Visual Quality · 分辨率 / 色彩 / 体积压缩',
     status:`<span style="color:var(--text-3);font-size:12px;">${r.dim2.width}×${r.dim2.height}px</span>`,
     content:renderDim2(r.dim2,r.file)},
    d3:{id:'dim-3',num:5,cls:'d3',title:'来源追溯',sub:'Origin Tracing · EXIF / IPTC / XMP / GPS',
     status:badge(r.dim3.completeness.label,{full:'ok',exif:'warn',iptc:'warn',icc:'warn',none:'danger'}[r.dim3.completeness.level]),
     content:renderDim3(r.dim3)},
    d5:{id:'dim-5',num:6,cls:'d5',title:'平台适配',sub:'Platform Compatibility · 主流平台规格核验',
     status:(()=>{const pass=r.dim5.results.filter(p=>p.pass).length,total=r.dim5.results.length;return badge(`${pass}/${total} 通过`,pass===total?'ok':pass>total/2?'warn':'danger');})(),
     content:renderDim5(r.dim5)},
  };
  const dims=[allDims.d1,allDims.d4,allDims.d6,allDims.d2,allDims.d3,allDims.d5];
  return dims.map(d=>`
    <div class="dim-section" id="${d.id}">
      <div class="dim-header open" onclick="App.toggleDim(this)">
        <div class="dim-num ${d.cls}">${d.num}</div>
        <div class="dim-title-wrap">
          <div class="dim-title">${d.title}</div>
          <div class="dim-sub">${d.sub}</div>
        </div>
        <div class="dim-status">${d.status}</div>
        <div class="dim-chevron">▶</div>
      </div>
      <div class="dim-body open">${d.content}</div>
    </div>`).join('');
}

// ============================================================
// 12. 报告导出
// ============================================================

function buildReportData(r) {
  return {
    meta:{file:r.file.name,size:r.file.size,analyzedAt:new Date().toISOString(),tool:'图片取证检查器 v1.1'},
    dim1_formatForensics:r.dim1,dim2_visualQuality:r.dim2,
    dim3_originTracing:{...r.dim3,raw_exif:Object.fromEntries(Object.entries(r.meta).filter(([k])=>!k.startsWith('_')))},
    dim4_aiDetection:r.dim4,
    dim5_platformCompatibility:r.dim5.results.map(p=>({platform:p.name,spec:p.spec,pass:p.pass,reasons:p.reasons})),
  };
}

function buildMarkdown(r) {
  const ts=new Date().toLocaleString('zh-CN');
  return[
    `# 图片取证报告`,``,
    `> 文件：${r.file.name}  |  时间：${ts}  |  图片取证检查器 v1.1`,``,
    `## 摘要`,``,
    `| 维度 | 结果 |`,`|---|---|`,
    `| 真实格式 | ${r.dim1.realFormat} (${r.dim1.mime}) |`,
    `| 文件扩展名 | .${r.dim1.declaredExt} |`,
    `| 扩展名一致性 | ${r.dim1.mismatch?'不一致（高风险）':'一致'} |`,
    `| 元数据状态 | ${r.dim3.completeness.label} |`,
    `| AI 生成可能性 | ${r.dim4.verdict.label} |`,``,
    `## 维度1：格式取证`,``,
    `- 真实格式：${r.dim1.realFormat}`,`- MIME：${r.dim1.mime}`,
    `- 编码方式：${r.dim1.encodingProcess}`,`- 文件大小：${formatBytes(r.dim1.fileSize)}`,
    `- 文件头：\`${r.dim1.magic}\``,`- SHA-256：\`${r.sha}\``,``,
    `## 维度2：显示质量`,``,
    `- 分辨率：${r.dim2.width}×${r.dim2.height}px (${r.dim2.mp}MP)`,
    `- 宽高比：${r.dim2.ratio}  色彩：${r.dim2.colorMode}  位深：${r.dim2.bitDepth}`,
    `- JPEG 质量估算：${r.dim2.jpegQuality!==null?r.dim2.jpegQuality:'—'}`,``,
    `## 维度3：来源追溯`,``,
    `- 完整性：${r.dim3.completeness.label}`,
    `- 相机：${[r.dim3.camera.make,r.dim3.camera.model].filter(Boolean).join(' ')||'—'}`,
    `- 拍摄时间：${r.dim3.shooting.dateTime||'—'}`,
    `- GPS：${r.dim3.gps.lat?`${r.dim3.gps.lat.toFixed(5)}, ${r.dim3.gps.lon.toFixed(5)}`:'—'}`,``,
    `## 维度4：AI 生成检测`,``,
    `**${r.dim4.verdict.label}**（${r.dim4.aiScore}/${r.dim4.maxScore}）`,``,
    ...r.dim4.signals.map(s=>`- ${s.positive?'[命中]':'[ — ]'} **${s.label}**：${s.detail}`),``,
    `## 维度5：平台适配`,``,
    `| 平台 | 规格 | 结果 |`,`|---|---|---|`,
    ...r.dim5.results.map(p=>`| ${p.name} | ${p.spec} | ${p.pass?'通过':'不符'} |`),``,
    `---`,`*图片取证检查器 v1.1 · ${ts}*`,
  ].join('\n');
}

function buildHTMLReport(r) {
  const ts=new Date().toLocaleString('zh-CN');
  return`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>取证报告·${escapeHtml(r.file.name)}</title><style>
body{font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;background:#f4f3ef;color:#26110a;padding:40px;max-width:900px;margin:0 auto;font-size:14px;}
.hdr{background:linear-gradient(135deg,#734e4b,#5d3f3c);color:white;padding:24px 32px;border-radius:16px;margin-bottom:24px;}
.hdr h1{font-size:20px;margin-bottom:4px;}.hdr .sub{font-size:12px;opacity:.75;}
.card{background:#fcfcfb;border:1px solid #e8e8e8;border-radius:16px;overflow:hidden;margin-bottom:14px;box-shadow:0 1px 3px rgba(38,17,10,.04);}
.ctitle{padding:10px 18px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#a89c97;border-bottom:1px solid #f0f0f0;background:#f8f8f5;}
.sgrid{display:grid;grid-template-columns:repeat(5,1fr);}
.si{padding:14px 18px;border-right:1px solid #f0f0f0;}.si:last-child{border-right:none;}
.slb{font-size:10px;color:#a89c97;text-transform:uppercase;margin-bottom:4px;}
.sv{font-size:14px;font-weight:700;}
table{width:100%;border-collapse:collapse;}
td{padding:8px 14px;border-bottom:1px solid #f0f0f0;vertical-align:top;font-size:13px;}
.k{color:#a89c97;width:180px;}.ok{color:#4a9d5b;}.warn{color:#d98f3e;}.danger{color:#c0392b;}.info{color:#5a8fba;}
.mono{font-family:'SF Mono',monospace;font-size:11px;word-break:break-all;background:#f4f3ef;padding:6px 10px;border-radius:6px;display:block;margin-top:3px;}
footer{color:#c4b8b4;font-size:11px;text-align:center;margin-top:32px;}
</style></head><body>
<div class="hdr"><h1>图片取证报告</h1><p class="sub">文件：${escapeHtml(r.file.name)} · 分析时间：${ts} · 图片取证检查器 v1.1</p></div>
<div class="card"><div class="ctitle">取证摘要</div>
<div class="sgrid">
<div class="si"><div class="slb">真实格式</div><div class="sv ${r.dim1.mismatch?'danger':'info'}">${r.dim1.realFormat}</div></div>
<div class="si"><div class="slb">扩展名</div><div class="sv">.${r.dim1.declaredExt}</div></div>
<div class="si"><div class="slb">一致性</div><div class="sv ${r.dim1.mismatch?'danger':'ok'}">${r.dim1.mismatch?'不一致':'一致'}</div></div>
<div class="si"><div class="slb">元数据</div><div class="sv ${r.dim3.completeness.color}">${r.dim3.completeness.label}</div></div>
<div class="si"><div class="slb">AI 可能性</div><div class="sv ${r.dim4.verdict.color}">${r.dim4.verdict.label.replace('AI 生成可能性：','')}</div></div>
</div></div>
<div class="card"><div class="ctitle">格式取证</div><table>
<tr><td class="k">真实格式</td><td>${r.dim1.realFormat} (${r.dim1.mime})</td></tr>
<tr><td class="k">扩展名一致性</td><td class="${r.dim1.mismatch?'danger':'ok'}">${r.dim1.mismatch?'不一致（高风险）':'一致'}</td></tr>
<tr><td class="k">编码方式</td><td>${r.dim1.encodingProcess}</td></tr>
<tr><td class="k">文件大小</td><td>${formatBytes(r.dim1.fileSize)}</td></tr>
<tr><td class="k">文件头（魔数）</td><td><span class="mono">${escapeHtml(r.dim1.magic)}</span></td></tr>
<tr><td class="k">SHA-256</td><td><span class="mono">${r.sha}</span></td></tr>
</table></div>
<div class="card"><div class="ctitle">显示质量</div><table>
<tr><td class="k">分辨率</td><td>${r.dim2.width}×${r.dim2.height}px (${r.dim2.mp}MP)</td></tr>
<tr><td class="k">宽高比</td><td>${r.dim2.ratio}</td></tr>
<tr><td class="k">色彩模式</td><td>${escapeHtml(r.dim2.colorMode)}</td></tr>
<tr><td class="k">JPEG 质量估算</td><td>${r.dim2.jpegQuality!==null?r.dim2.jpegQuality:'—'}</td></tr>
<tr><td class="k">色域</td><td>${escapeHtml(r.dim2.colorGamut)}</td></tr>
</table></div>
<div class="card"><div class="ctitle">来源追溯</div><table>
<tr><td class="k">完整性</td><td class="${r.dim3.completeness.color}">${r.dim3.completeness.label}</td></tr>
<tr><td class="k">相机</td><td>${escapeHtml([r.dim3.camera.make,r.dim3.camera.model].filter(Boolean).join(' '))||'—'}</td></tr>
<tr><td class="k">拍摄时间</td><td>${r.dim3.shooting.dateTime||'—'}</td></tr>
<tr><td class="k">快门/光圈/ISO</td><td>${[r.dim3.shooting.shutterSpeed,r.dim3.shooting.aperture,r.dim3.shooting.iso?'ISO '+r.dim3.shooting.iso:null].filter(Boolean).join(' / ')||'—'}</td></tr>
</table></div>
<div class="card"><div class="ctitle">AI 生成检测（启发式）</div><table>
<tr><td class="k">综合评定</td><td class="${r.dim4.verdict.color}">${r.dim4.verdict.label}（${r.dim4.aiScore}/${r.dim4.maxScore}）</td></tr>
${r.dim4.signals.map(s=>`<tr><td class="k">${escapeHtml(s.label)}</td><td class="${s.positive?'danger':'ok'}">${escapeHtml(s.detail)}</td></tr>`).join('')}
</table></div>
<div class="card"><div class="ctitle">平台适配</div>
<table><thead><tr><th style="padding:8px 14px;text-align:left;font-size:10px;color:#a89c97;border-bottom:1px solid #e8e8e8;">平台</th><th style="padding:8px 14px;text-align:left;font-size:10px;color:#a89c97;border-bottom:1px solid #e8e8e8;">规格</th><th style="padding:8px 14px;text-align:left;font-size:10px;color:#a89c97;border-bottom:1px solid #e8e8e8;">结果</th></tr></thead>
<tbody>${r.dim5.results.map(p=>`<tr><td>${p.name}</td><td style="font-size:12px;color:#a89c97;">${p.spec}</td><td class="${p.pass?'ok':'danger'}">${p.pass?'通过':'不符'}</td></tr>`).join('')}</tbody></table>
</div>
<footer>图片取证检查器 v1.1 · ${ts}</footer>
</body></html>`;
}

// ============================================================
// 13. 历史记录管理
// ============================================================

const HISTORY_KEY = 'forensics_history_v1';
const HISTORY_MAX = 30;

async function thumbToDataURL(file, size=72) {
  try {
    const img = await loadImageEl(file);
    const canvas=document.createElement('canvas');
    const ratio=img.naturalWidth/img.naturalHeight;
    canvas.width=size; canvas.height=Math.round(size/ratio);
    canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/jpeg',0.7);
  } catch(e){ return null; }
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]'); } catch(e){ return []; }
}

function saveHistoryEntry(r, thumbDataURL) {
  const list=loadHistory();
  const entry={
    id: Date.now(),
    savedAt: new Date().toISOString(),
    filename: r.file.name,
    fileSize: r.file.size,
    thumbDataURL,
    sha: r.sha,
    format: r.format,
    dim1: r.dim1, dim2: r.dim2,
    dim3: {completeness:r.dim3.completeness,hasEXIF:r.dim3.hasEXIF,hasIPTC:r.dim3.hasIPTC,hasXMP:r.dim3.hasXMP,camera:r.dim3.camera,shooting:r.dim3.shooting,gps:r.dim3.gps,copyright:r.dim3.copyright},
    dim4: r.dim4,
    dim5: r.dim5,
    dim6: r.dim6,
  };
  list.unshift(entry);
  if (list.length>HISTORY_MAX) list.length=HISTORY_MAX;
  try { localStorage.setItem(HISTORY_KEY,JSON.stringify(list)); } catch(e){}
}

function deleteHistoryEntry(id) {
  const list=loadHistory().filter(e=>e.id!==id);
  try { localStorage.setItem(HISTORY_KEY,JSON.stringify(list)); } catch(e){}
}

// ============================================================
// 14. App 主模块
// ============================================================

const App = (() => {
  let _results=[], _activeIdx=0, _observer=null, _historyMode=false;

  async function processFiles(files) {
    if (!files.length) return;
    _historyMode=false;
    document.getElementById('dropZone').classList.add('hidden');
    document.getElementById('results').classList.remove('hidden');
    document.getElementById('loadingState').classList.remove('hidden');
    document.getElementById('results').classList.remove('history-view-mode');
    ['summaryCard','alertBanner','dimensionList'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML='';});
    document.getElementById('sectionNav').classList.add('hidden');
    document.getElementById('alertBanner').classList.add('hidden');
    _results=[];
    for (const file of files) {
      try { _results.push(await analyzeFile(file)); }
      catch(e){ _results.push({file,error:e.message}); }
    }
    document.getElementById('loadingState').classList.add('hidden');
    renderFileTabs();
    _activeIdx=0;
    renderActive();
    // 自动保存到历史
    for (const r of _results) {
      if (!r.error) {
        const thumb=await thumbToDataURL(r.file).catch(()=>null);
        saveHistoryEntry(r, thumb);
      }
    }
    updateHistoryCount();
  }

  function renderFileTabs() {
    const tabs=document.getElementById('fileTabs');
    tabs.classList.remove('hidden');
    const filePart=_results.map((r,i)=>{
      const ext=r.file.name.split('.').pop().toLowerCase();
      return`<div class="file-tab ${r.dim1?.mismatch?'tab-conflict':''} ${i===_activeIdx?'active':''}" onclick="App.showFile(${i})" title="${r.file.name}">
        <span>${r.file.name.length>22?r.file.name.slice(0,20)+'…':r.file.name}</span>
        <span class="tab-ext-badge">.${ext}</span>
      </div>`;
    }).join('');
    const histCount=loadHistory().length;
    tabs.innerHTML=`
      ${filePart}
      <label class="tab-add-label" id="tabAddLabel" title="拖入图片 或 点击选择文件">
        ＋ 新检测 <span style="font-size:10px;opacity:.6;">/ 拖入图片</span>
        <input type="file" id="tabFileInput" accept="image/*" multiple style="display:none">
      </label>
      <button class="tab-history-btn" onclick="App.openHistory()" title="查看历史记录">
        历史 <span class="tab-history-count" id="historyCount">${histCount}</span>
      </button>`;
    document.getElementById('tabFileInput')?.addEventListener('change',e=>{
      if (e.target.files.length) processFiles(Array.from(e.target.files));
    });
    // 拖拽支持
    const lbl=document.getElementById('tabAddLabel');
    if (lbl) {
      lbl.addEventListener('dragover',e=>{e.preventDefault();e.stopPropagation();lbl.classList.add('drag-over');});
      lbl.addEventListener('dragleave',e=>{e.stopPropagation();lbl.classList.remove('drag-over');});
      lbl.addEventListener('drop',e=>{
        e.preventDefault();e.stopPropagation();
        lbl.classList.remove('drag-over');
        const files=Array.from(e.dataTransfer.files).filter(f=>f.type.startsWith('image/'));
        if (files.length) processFiles(files);
      });
    }
  }

  function updateHistoryCount() {
    const el=document.getElementById('historyCount');
    if (el) el.textContent=loadHistory().length;
  }

  function showFile(idx) {
    _activeIdx=idx;
    document.querySelectorAll('.file-tab').forEach((t,i)=>t.classList.toggle('active',i===idx));
    renderActive();
  }

  function renderActive() {
    const r=_results[_activeIdx];
    if (!r||r.error){
      document.getElementById('summaryCard').innerHTML=`<div style="padding:20px;color:var(--danger);">分析失败：${r?.error||'未知错误'}</div>`;
      return;
    }
    document.getElementById('summaryCard').innerHTML=renderSummary(r);
    const alertHtml=renderAlerts(r);
    const banner=document.getElementById('alertBanner');
    if (alertHtml){banner.innerHTML=alertHtml;banner.classList.remove('hidden');}
    else banner.classList.add('hidden');
    document.getElementById('dimensionList').innerHTML=renderDimensions(r);
    document.getElementById('sectionNav').classList.remove('hidden');
    // 默认选中第一个预设
    const firstBtn=document.querySelector('.preset-btn');
    const p0=SIZE_PRESETS[0];
    if (firstBtn&&p0) selectPreset(p0.w,p0.h,p0.targetKB||null,firstBtn);
    // 初始化滚动高亮
    if (_observer){_observer.disconnect();_observer=null;}
    _observer=initSectionObserver();
  }

  function toggleDim(header) {
    header.classList.toggle('open');
    header.nextElementSibling.classList.toggle('open');
  }

  // 格式转换
  async function convertFormat(mimeType) {
    const r=_results[_activeIdx]; if (!r) return;
    const extMap={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
    const btn=event?.target; if(btn){btn.disabled=true;btn.textContent='转换中…';}
    setStatus('convertStatus','');
    try {
      const blob=await canvasConvert(r.file, mimeType);
      const newName=r.file.name.replace(/\.[^.]+$/,'')+'.'+extMap[mimeType];
      downloadBlob(blob,newName);
      setStatus('convertStatus',`完成 ${newName} (${formatBytes(blob.size)})`);
    } catch(e){ setStatus('convertStatus','转换失败: '+e.message,true); }
    finally { if(btn){btn.disabled=false;btn.textContent={jpeg:'转为 JPEG',png:'转为 PNG',webp:'转为 WebP'}[extMap[mimeType]]||btn.textContent;} }
  }

  // 压缩到指定体积
  async function compressImage() {
    const r=_results[_activeIdx]; if (!r) return;
    const targetKB=parseFloat(document.getElementById('compressTargetKB')?.value)||300;
    setStatus('compressStatus','压缩中…');
    try {
      const origStr=formatBytes(r.file.size);
      const {blob,note}=await compressToSize(r.file, targetKB);
      const newName=r.file.name.replace(/\.[^.]+$/,'')+'_compressed.jpg';
      downloadBlob(blob,newName);
      setStatus('compressStatus',`原始 ${origStr} → ${note}`);
    } catch(e){ setStatus('compressStatus','失败: '+e.message,true); }
  }

  // 选中预设（填入输入框，不执行）
  function selectPreset(w, h, targetKB, btn) {
    const wEl=document.getElementById('resizeW');
    const hEl=document.getElementById('resizeH');
    const kbEl=document.getElementById('cropCompressKB');
    if (wEl) wEl.value=w;
    if (hEl) hEl.value=h;
    if (kbEl && targetKB) kbEl.value=targetKB;
    document.querySelectorAll('.preset-btn').forEach(b=>b.classList.remove('selected'));
    if (btn) btn.classList.add('selected');
    setStatus('resizeStatus','');
    setStatus('cropCompressStatus','');
  }

  // 执行裁切下载（读取输入框）
  async function resizeCustom() {
    const w=parseInt(document.getElementById('resizeW')?.value);
    const h=parseInt(document.getElementById('resizeH')?.value);
    if (!w||!h||w<1||h<1){setStatus('resizeStatus','请先选择预设或输入宽高',true);return;}
    const r=_results[_activeIdx]; if (!r) return;
    const origW=r.dim2?.width||'?', origH=r.dim2?.height||'?';
    setStatus('resizeStatus',`处理中 ${w}×${h}…`);
    try {
      const blob=await resizeWithCenterCrop(r.file, w, h);
      const ext=r.file.type==='image/png'?'png':r.file.type==='image/webp'?'webp':'jpg'; // HEIC→jpg
      const newName=r.file.name.replace(/\.[^.]+$/,'')+`_${w}x${h}.${ext}`;
      downloadBlob(blob,newName);
      setStatus('resizeStatus',`${origW}×${origH} · ${formatBytes(r.file.size)} → ${w}×${h} · ${formatBytes(blob.size)}`);
    } catch(e){ setStatus('resizeStatus','失败: '+e.message,true); }
  }

  // 裁切 + 压缩一键操作
  async function cropAndCompress() {
    const w=parseInt(document.getElementById('resizeW')?.value);
    const h=parseInt(document.getElementById('resizeH')?.value);
    const targetKB=parseFloat(document.getElementById('cropCompressKB')?.value);
    if (!w||!h||w<1||h<1){setStatus('cropCompressStatus','请先选择预设或输入宽高',true);return;}
    if (!targetKB||targetKB<1){setStatus('cropCompressStatus','请输入目标体积（kB）',true);return;}
    const r=_results[_activeIdx]; if (!r) return;
    const origW=r.dim2?.width||'?', origH=r.dim2?.height||'?';
    setStatus('cropCompressStatus',`处理中…`);
    try {
      const croppedBlob=await resizeWithCenterCrop(r.file, w, h);
      const {blob,note}=await compressToSize(croppedBlob, targetKB);
      const newName=r.file.name.replace(/\.[^.]+$/,'')+`_${w}x${h}_compressed.jpg`;
      downloadBlob(blob,newName);
      setStatus('cropCompressStatus',`${origW}×${origH} · ${formatBytes(r.file.size)} → ${w}×${h} · ${note}`);
    } catch(e){ setStatus('cropCompressStatus','失败: '+e.message,true); }
  }

  // 保留旧接口
  async function resizeImage(w, h) {
    selectPreset(w, h, null, null);
    await resizeCustom();
  }

  function copyText(text, btnId) {
    navigator.clipboard.writeText(text).then(()=>{
      const btn=document.getElementById(btnId);
      if (!btn) return;
      const orig=btn.textContent;
      btn.textContent='✓ 已复制';
      btn.classList.add('copied');
      setTimeout(()=>{btn.textContent=orig;btn.classList.remove('copied');},2000);
    }).catch(()=>{
      const el=document.createElement('textarea');
      el.value=text; document.body.appendChild(el);
      el.select(); document.execCommand('copy');
      document.body.removeChild(el);
    });
  }

  // 复制图片到系统剪贴板（可粘贴进 ChatGPT / Claude 等 AI 对话框）
  async function copyImageToClipboard(btn) {
    const r=_results[_activeIdx]; if (!r) return;
    const orig=btn?btn.textContent:'';
    if (btn){btn.disabled=true;btn.textContent='复制中…';}
    try {
      const img=await loadImageEl(r.file);
      const canvas=document.createElement('canvas');
      canvas.width=img.naturalWidth; canvas.height=img.naturalHeight;
      canvas.getContext('2d').drawImage(img,0,0);
      const blob=await new Promise(res=>canvas.toBlob(res,'image/png'));
      await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
      if (btn){btn.textContent='✓ 已复制，去粘贴吧';btn.classList.add('copied');setTimeout(()=>{btn.textContent=orig;btn.classList.remove('copied');btn.disabled=false;},2500);}
    } catch(e) {
      // 降级提示（Firefox 或无权限时）
      if (btn){btn.textContent='请右键图片 → 复制图片';btn.classList.add('error');setTimeout(()=>{btn.textContent=orig;btn.classList.remove('error');btn.disabled=false;},3000);}
    }
  }

  function downloadBlob(blob, filename) {
    const url=URL.createObjectURL(blob);
    const a=Object.assign(document.createElement('a'),{href:url,download:filename});
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  }

  function exportJSON() {
    const r=_results[_activeIdx]; if (!r) return;
    const data=buildReportData(r);
    downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),`forensics-${r.file.name}.json`);
  }

  function exportMarkdown() {
    const r=_results[_activeIdx]; if (!r) return;
    downloadBlob(new Blob([buildMarkdown(r)],{type:'text/markdown'}),`forensics-${r.file.name}.md`);
  }

  function exportHTML() {
    const r=_results[_activeIdx]; if (!r) return;
    downloadBlob(new Blob([buildHTMLReport(r)],{type:'text/html'}),`forensics-${r.file.name}.html`);
  }

  function reset() {
    _results.forEach(r=>{if(r.thumbURL)URL.revokeObjectURL(r.thumbURL);});
    _results=[]; _activeIdx=0; _historyMode=false;
    if (_observer){_observer.disconnect();_observer=null;}
    document.getElementById('dropZone').classList.remove('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('results').classList.remove('history-view-mode');
    document.getElementById('fileTabs').classList.add('hidden');
    document.getElementById('fileTabs').innerHTML='';
    document.getElementById('fileInput').value='';
    closeHistory();
  }

  // ── 历史面板 ──
  function openHistory() {
    renderHistoryPanel();
    document.getElementById('historyOverlay').classList.remove('hidden');
    document.getElementById('historyPanel').classList.remove('hidden');
  }

  function closeHistory() {
    document.getElementById('historyOverlay').classList.add('hidden');
    document.getElementById('historyPanel').classList.add('hidden');
  }

  function renderHistoryPanel() {
    const list=loadHistory();
    const container=document.getElementById('historyList');
    if (!list.length){
      container.innerHTML=`<div class="history-empty">暂无历史记录<br><span style="font-size:12px;">每次检测完成后自动保存</span></div>`;
      return;
    }
    container.innerHTML=list.map(e=>{
      const date=new Date(e.savedAt).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
      const fmtTag=e.dim1?.mismatch?`<span class="badge badge-danger" style="font-size:10px;">伪装</span>`:
                   `<span class="badge badge-info" style="font-size:10px;">${e.format?.format||'?'}</span>`;
      const aiTag={ok:`<span class="badge badge-ok" style="font-size:10px;">非AI</span>`,warn:`<span class="badge badge-warn" style="font-size:10px;">疑似AI</span>`,danger:`<span class="badge badge-danger" style="font-size:10px;">AI生成</span>`}[e.dim4?.verdict?.color||'ok'];
      const metaTag={none:`<span class="badge badge-danger" style="font-size:10px;">无元数据</span>`,full:`<span class="badge badge-ok" style="font-size:10px;">EXIF完整</span>`}[e.dim3?.completeness?.level]||'';
      return`<div class="history-item" onclick="App.viewHistoryEntry(${e.id})">
        <img class="history-thumb" src="${e.thumbDataURL||''}" alt="" onerror="this.style.display='none'">
        <div class="history-item-info">
          <div class="history-item-name" title="${escapeHtml(e.filename)}">${escapeHtml(e.filename.length>28?e.filename.slice(0,26)+'…':e.filename)}</div>
          <div class="history-item-meta">${formatBytes(e.fileSize)} · ${date}</div>
          <div class="history-item-tags">${fmtTag}${aiTag}${metaTag}</div>
        </div>
        <button class="history-item-del" title="删除此记录" onclick="event.stopPropagation();App.deleteHistory(${e.id})">✕</button>
      </div>`;
    }).join('');
  }

  function viewHistoryEntry(id) {
    const entry=loadHistory().find(e=>e.id===id);
    if (!entry) return;
    closeHistory();
    _historyMode=true;
    // 构造模拟 result 对象
    const mockFile={name:entry.filename,size:entry.fileSize,type:entry.format?.mime||'image/jpeg'};
    const r={
      file:mockFile, format:entry.format, sha:entry.sha,
      thumbURL:entry.thumbDataURL,
      dim1:entry.dim1, dim2:entry.dim2, dim3:entry.dim3,
      dim4:entry.dim4, dim5:entry.dim5,
    };
    // 显示结果区
    document.getElementById('dropZone').classList.add('hidden');
    document.getElementById('results').classList.remove('hidden');
    document.getElementById('results').classList.add('history-view-mode');
    document.getElementById('loadingState').classList.add('hidden');
    // 渲染 tabs 里标记历史模式
    const tabs=document.getElementById('fileTabs');
    tabs.classList.remove('hidden');
    const histCount=loadHistory().length;
    tabs.innerHTML=`
      <div class="file-tab active" style="cursor:default;">
        <span>${escapeHtml(entry.filename.length>22?entry.filename.slice(0,20)+'…':entry.filename)}</span>
        <span class="tab-ext-badge" style="background:var(--warning-bg);color:var(--warning);">历史</span>
      </div>
      <span style="font-size:11px;color:var(--text-3);padding:0 8px;line-height:32px;">${new Date(entry.savedAt).toLocaleString('zh-CN')}</span>
      <label class="tab-add-label" id="tabAddLabel" style="margin-left:auto;" title="拖入图片 或 点击选择文件">
        ＋ 新检测 <span style="font-size:10px;opacity:.6;">/ 拖入图片</span>
        <input type="file" id="tabFileInput" accept="image/*" multiple style="display:none">
      </label>
      <button class="tab-history-btn" onclick="App.openHistory()">
        历史 <span class="tab-history-count" id="historyCount">${histCount}</span>
      </button>`;
    document.getElementById('tabFileInput')?.addEventListener('change',e2=>{
      if(e2.target.files.length) processFiles(Array.from(e2.target.files));
    });
    const lbl2=document.getElementById('tabAddLabel');
    if (lbl2) {
      lbl2.addEventListener('dragover',e=>{e.preventDefault();e.stopPropagation();lbl2.classList.add('drag-over');});
      lbl2.addEventListener('dragleave',e=>{e.stopPropagation();lbl2.classList.remove('drag-over');});
      lbl2.addEventListener('drop',e=>{
        e.preventDefault();e.stopPropagation();
        lbl2.classList.remove('drag-over');
        const files=Array.from(e.dataTransfer.files).filter(f=>f.type.startsWith('image/'));
        if (files.length) processFiles(files);
      });
    }
    // 渲染内容（history-view-mode 会隐藏 action-panel）
    document.getElementById('summaryCard').innerHTML=renderSummary(r);
    const alertHtml=renderAlerts(r);
    const banner=document.getElementById('alertBanner');
    if (alertHtml){banner.innerHTML=alertHtml;banner.classList.remove('hidden');}
    else banner.classList.add('hidden');
    document.getElementById('dimensionList').innerHTML=renderDimensions(r);
    document.getElementById('sectionNav').classList.remove('hidden');
    if (_observer){_observer.disconnect();_observer=null;}
    _observer=initSectionObserver();
  }

  function deleteHistory(id) {
    deleteHistoryEntry(id);
    renderHistoryPanel();
    updateHistoryCount();
  }

  function clearHistory() {
    if (!confirm('确认清空所有历史记录？')) return;
    localStorage.removeItem(HISTORY_KEY);
    renderHistoryPanel();
    updateHistoryCount();
  }

  function initSectionObserver() {
    const links=document.querySelectorAll('.snav-link');
    if (!links.length) return null;
    const sections=[1,4,6,2,3,5].map(i=>document.getElementById(`dim-${i}`)).filter(Boolean);
    const obs=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if (entry.isIntersecting) {
          links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')===`#${entry.target.id}`));
        }
      });
    },{threshold:0.15,rootMargin:'-48px 0px -55% 0px'});
    sections.forEach(s=>obs.observe(s));
    return obs;
  }

  function init() {
    const dropZone=document.getElementById('dropZone');
    const fileInput=document.getElementById('fileInput');
    dropZone.addEventListener('click',(e)=>{if(!e.target.closest('label'))fileInput.click();});
    fileInput.addEventListener('change',e=>processFiles(Array.from(e.target.files)));
    dropZone.addEventListener('dragover',e=>{e.preventDefault();dropZone.classList.add('drag-over');});
    dropZone.addEventListener('dragleave',()=>dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop',e=>{e.preventDefault();dropZone.classList.remove('drag-over');processFiles(Array.from(e.dataTransfer.files));});
  }

  return {init,showFile,toggleDim,convertFormat,compressImage,selectPreset,resizeImage,resizeCustom,cropAndCompress,copyImageToClipboard,exportJSON,exportMarkdown,exportHTML,reset,openHistory,closeHistory,viewHistoryEntry,deleteHistory,clearHistory,copyText};
})();

document.addEventListener('DOMContentLoaded',App.init);
