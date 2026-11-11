/* Original semantic graphics. All legal labels remain live vector text.
   The architectural film is a separate Blender render, never represented as WebGL. */
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const t=(x,y,s,z=30,c='currentColor',w=600)=>`<text x="${x}" y="${y}" font-size="${z}" fill="${c}" font-weight="${w}">${s.split('\n').map((v,i)=>`<tspan x="${x}" dy="${i?z*1.15:0}">${esc(v)}</tspan>`).join('')}</text>`;
const C='var(--signal)',M='var(--soft)',I='var(--diagram-ink)';
const tag=(x,y,s)=>t(x,y,s,16,M,500);
const line=(d,c=I,dash=false)=>`<path d="${d}" stroke="${c}" fill="none" stroke-width="2" ${dash?'stroke-dasharray="8 8"':''}/>`;
const route=(d,n=0,dash=false)=>`<g class="route route-${n}">${line(d,I,dash)}<path d="${d}" fill="none" stroke="${C}" stroke-width="4" pathLength="100" class="signal"/><circle r="5" fill="${C}" opacity=".8"><animateMotion dur="${24+n*6}s" repeatCount="indefinite" path="${d}"/></circle></g>`;
const phase=(s,n)=>`<g class="phase phase-${n}">${s}</g>`;
const dot=(x,y,n=0)=>`<circle cx="${x}" cy="${y}" r="6" fill="${C}" class="pulse phase-${n}"/>`;
const bar=(x,y,w,h,c=C)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
const circle=(x,y,r,c)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const cap=s=>tag(46,42,s);
const base=s=>tag(46,680,s);
function cover(){return `<div class="equal-composition" aria-label="Публичный субъект и частное лицо. Вопрос о равенстве их положения в гражданском обороте"><div class="equal-caption"><span>ПОЛОЖЕНИЕ В ГРАЖДАНСКОМ ОБОРОТЕ</span></div><div class="equal-art"><div class="equal-bar first"><b>ПУБЛИЧНЫЙ СУБЪЕКТ</b></div><div class="equal-bar second"><b>ЧАСТНОЕ ЛИЦО</b></div></div><div class="equal-bottom"><span>ГК РФ / СТ. 124</span><span class="equal-query">= ?</span><span>ОТКРЫТЫЙ ВОПРОС</span></div><p>Один публичный субъект.<br>Два правовых режима.</p></div>`}
function subjects(){return cap('01 / САМОСТОЯТЕЛЬНЫЕ УЧАСТНИКИ')+
phase(t(46,150,'РФ',104,I,750)+tag(48,186,'РОССИЙСКАЯ ФЕДЕРАЦИЯ')+route('M260 130H680V570',0),0)+
phase(t(46,300,'СУБЪЕКТ РФ',58,I,700)+route('M445 280H680',1),1)+
phase(t(46,425,'МО',104,C,750)+tag(48,462,'МУНИЦИПАЛЬНОЕ ОБРАЗОВАНИЕ')+route('M260 405H680',2),2)+
line('M46 526H595',I,true)+t(46,585,'ЮРИДИЧЕСКОЕ ЛИЦО',38,I,650)+route('M615 570H680',3)+tag(46,626,'Сопоставьте основания и особенности статуса')+circle(680,570,11,C)+`<text transform="translate(725 270) rotate(90)" font-size="18" fill="${I}" letter-spacing="2">ГРАЖДАНСКИЙ ОБОРОТ</text>`+line('M620 108L647 135 M620 135H647V108',C)+base('Общие правила не снимают вопрос о различиях.');}
function equality(){return cap('02 / В КАКОМ КАЧЕСТВЕ ДЕЙСТВУЕТ СУБЪЕКТ?')+
bar(46,90,700,180,C)+t(76,155,'ВЛАСТНОЕ',48,'#fff',750)+t(76,213,'ПОЛНОМОЧИЕ',48,'#fff',750)+
route('M396 270V385',0,true)+tag(420,330,'Предел применения?')+
t(46,467,'ПУБЛИЧНЫЙ',35,I,700)+t(46,509,'УЧАСТНИК',35,I,700)+t(485,467,'ЧАСТНЫЙ',35,I,700)+t(485,509,'УЧАСТНИК',35,I,700)+
route('M46 555H746',1)+bar(350,435,90,13,C)+bar(350,469,90,13,C)+tag(46,612,'ГРАЖДАНСКОЕ ПРАВООТНОШЕНИЕ')+base('Может ли распоряжение заменить исполнение договора?');}
function capacity(){let s=cap('03 / ПРАВОСПОСОБНОСТЬ И ПРЕДЕЛЫ УЧАСТИЯ');
 s+=`<path d="M46 100H746V595H46Z" fill="url(#hatch)"/><path d="M95 150H695V545H95Z" fill="var(--diagram-bg)" stroke="${I}" stroke-width="2"/>`;
 s+=tag(115,192,'ПУБЛИЧНАЯ ЦЕЛЬ')+t(115,278,'ПУБЛИЧНОЕ',48,I,750)+t(115,335,'ОБРАЗОВАНИЕ',48,I,750)+route('M120 385H670',0)+phase(t(115,444,'ПРИОБРЕСТИ?',31,C)+t(115,494,'РАСПОРЯДИТЬСЯ?',31,C),1)+tag(46,632,'ОГРАНИЧЕНИЯ ЗАКОНА / ДОПУСТИМОСТЬ ОБЪЕКТА');return s+base('Где проходит граница конкретного действия?');}
function agency(){return cap('04 / ПРАВА ВОЗНИКАЮТ ЧЕРЕЗ ДЕЙСТВИЕ')+
t(46,140,'ПУБЛИЧНЫЙ',48,I,750)+t(46,197,'СУБЪЕКТ',48,I,750)+
route('M80 235V345H295',0)+tag(110,291,'КОМПЕТЕНЦИЯ')+
bar(295,290,450,135,C)+t(325,377,'ОРГАН',79,'#fff',750)+
route('M660 425V535H330',1)+tag(420,486,'ОТ ЧЬЕГО ИМЕНИ?')+
t(46,579,'КОНТРАГЕНТ',54,I,750)+tag(46,623,'Подписант и сторона: совпадают ли они?')+base('Проверьте полномочие и содержание сделки.');}
function treasury(){return cap('05 / ОДИН СОБСТВЕННИК. РАЗНЫЕ РЕЖИМЫ.')+
t(46,126,'ПУБЛИЧНЫЙ',46,I,750)+t(46,181,'СОБСТВЕННИК',46,I,750)+route('M400 215V270H75V320 M400 270H520V320',0)+
bar(46,330,320,267,C)+t(70,393,'КАЗНА',47,'#fff',750)+line('M70 425H342','#ffffff70')+t(70,466,'Средства\nбюджета',26,'#111515',600)+t(70,546,'Незакрепленное\nимущество',25,'#111515',600)+
bar(396,330,350,267,'var(--diagram-muted)')+t(420,395,'ЗАКРЕПЛЕННОЕ',29,I,750)+t(420,435,'ИМУЩЕСТВО',29,I,750)+t(420,505,'За учреждениями\nи предприятиями',24,I,500)+base('Казна: субъект или состав имущества?');}
function liability(){return cap('06 / ДВА ОБЯЗАТЕЛЬСТВА. ОТДЕЛЬНОЕ ОСНОВАНИЕ.')+
t(46,130,'ПУБЛИЧНЫЙ',34,I,750)+t(46,173,'СУБЪЕКТ',34,I,750)+t(466,140,'ОРГАНИЗАЦИЯ',36,I,750)+tag(466,179,'СОЗДАННОЕ ЮРИДИЧЕСКОЕ ЛИЦО')+
route('M80 210V490',0)+route('M510 210V490',1)+tag(102,280,'СВОЙ ДОЛГ')+tag(532,280,'СВОЙ ДОЛГ')+
t(46,545,'КРЕДИТОР',36,I,650)+t(466,545,'КРЕДИТОР',36,I,650)+
route('M225 210V375H700V490',2,true)+bar(285,335,360,80,C)+t(308,383,'ОСНОВАНИЕ?',34,'#fff',700)+base('Ответственность за чужой долг: какое основание?');}
function remedy(){return cap('07 / ВОССТАНОВИТЕ ПРИЧИННУЮ ЦЕПЬ')+
bar(46,105,90,90,C)+t(69,168,'01',40,'#fff',700)+t(165,143,'ДЕЙСТВИЕ ОРГАНА',36,I,700)+tag(165,182,'Законность и основание решения')+
route('M90 195V285',0)+bar(46,285,90,90,I)+t(68,348,'02',40,'var(--diagram-bg)',700)+t(165,325,'ПОСЛЕДСТВИЯ',36,I,700)+tag(165,365,'Связь действия с потерями')+
route('M90 375V465',1)+bar(46,465,90,90,C)+t(68,528,'03',40,'#fff',700)+t(165,505,'УБЫТКИ',36,I,700)+tag(165,545,'Вид, размер, доказательства')+
bar(46,604,700,2,I)+t(46,645,'КТО ВОЗМЕЩАЕТ?',36,C,750);}
function case1(p){return cap('ПРОДАЖА НЕДВИЖИМОСТИ / ТРИ РОЛИ')+t(46,135,'ГОРОД',62,I,750)+tag(46,176,'Собственник / ЕГРН')+
route('M80 210V390H450',0,true)+t(420,325,'КОМИТЕТ',46,C,750)+tag(420,364,'Подписант / ЕГРЮЛ')+tag(110,495,'Условная схема здания')+
`<g class="building-plan"><path d="M110 248H330V470H110Z M110 315H240V470 M240 248V315 M260 248V360H330 M260 390H330" fill="none" stroke="${I}" stroke-width="3"/><path d="M120 458H230V325H120Z" fill="${C}" opacity=".18"/></g>`+
route('M660 400V525H80',1)+t(46,578,'ООО «АЛЬФА»',53,I,750)+tag(46,624,'Оплата произведена. Здание не передано.')+base(p.step>=2?'Проверяем подтвержденное полномочие комитета.':'Кому адресовано требование о передаче?');}
function case2(p){return cap('ПОСТАВКА ИСПОЛНЕНА / ОПЛАТЫ НЕТ')+bar(46,94,315,390,'var(--diagram-muted)')+bar(387,94,359,390,C)+t(70,185,'ФКУ',70,I,750)+t(414,185,'ФБУ',70,'#fff',750)+t(70,245,'Казенное',25,I,500)+t(414,245,'Бюджетное',25,'#111515',600)+t(70,338,'1 800 000',43,I,750)+t(414,338,'1 500 000',45,'#fff',750)+t(70,386,'рублей',22,I,500)+t(414,386,'рублей',22,'#111515',600)+route('M205 484V555H560V484',1,true)+t(46,612,'ОДИН ОТВЕТЧИК?',41,I,750)+base(p.step>=2?'ФКУ: судебный акт не исполнен. Каков следующий шаг?':'Режим учреждения меняет правовую квалификацию.');}
function case3(p){return cap('РЕГИСТРАЦИЯ / РАЗГРАНИЧЕНИЕ ДЕЙСТВИЙ')+t(46,133,'«ПОРТ»',44,I,750)+t(490,133,'«АТЛАС»',44,I,750)+route('M235 119H468',0)+tag(46,186,'ЗДАНИЕ В САРАТОВЕ / 12 000 000 ₽')+
bar(46,230,700,2,I)+t(46,304,'МФЦ',47,I,750)+tag(46,344,'Прием документов')+route('M240 287H460',1)+t(480,304,'РОСРЕЕСТР',36,C,750)+tag(480,344,'Приостановление. Отказ.')+
route('M660 365V430H80',2,true)+tag(46,473,'ЗАЯВЛЕННЫЕ УБЫТКИ')+t(46,552,'480 000',55,I,750)+t(405,552,'1 600 000',55,C,750)+tag(46,595,'Реальный ущерб')+tag(405,595,'Упущенная выгода')+base('Разберите причинную связь по каждой сумме.');}
function case4(p){return cap('ИМУЩЕСТВО / УПРАВЛЕНИЕ / АРЕНДА')+t(46,132,'ГОРОД Н',55,I,750)+tag(46,173,'Собственник помещения')+route('M80 205V290',0)+t(46,340,'МБУ «ЦЕНТР СПОРТА»',36,I,750)+tag(46,384,'Право оперативного управления')+route('M80 415V485H500',1)+bar(420,445,326,120,C)+t(440,500,'ООО «ЛИНИЯ»',34,'#111515',700)+t(440,541,'Арендатор',23,'#111515',600)+tag(46,617,'11 МЕСЯЦЕВ / 180 000 ₽ В МЕСЯЦ')+base(p.step>=2?'Какая сделка и кем согласована?':'540 000 ₽ перечислены учреждению.');}
function case5(p){let s=cap('ГОРОД ВЛАДЕЕТ АКЦИЯМИ. ДОГОВОР ЗАКЛЮЧИЛО АО.')+t(46,137,'ГОРОД',56,I,750)+route('M283 120H510',0)+tag(320,161,'100% АКЦИЙ')+t(565,137,'АО',74,C,750)+
route('M650 180V245H80',1)+t(46,302,'ООО «ТЕХСНАБ»',43,I,750)+tag(46,343,'Поставка: 5 400 000 ₽')+
bar(46,389,104,48,'var(--diagram-muted)')+bar(150,389,596,48,C)+tag(46,473,'ОПЛАЧЕНО 800 000 ₽')+t(46,546,'4 600 000 ₽',70,I,750)+tag(46,584,'ОСТАВШАЯСЯ ЗАДОЛЖЕННОСТЬ');s+=p.step>=2?line('M46 610H746V685H46Z',C,true)+t(64,644,'ПРЕДЕЛ ГАРАНТИИ: 3 000 000 ₽',29,I,700)+tag(64,670,'Вариант. Выплата по гарантии не указана.'):base('Письмо о финансировании: каково правовое значение?');return s;}
const functions={subjects,equality,capacity,agency,treasury,liability,remedy,case1,case2,case3,case4,case5};
export function mountSemanticStage(container,p){
 const isCover=p.type==='cover'||p.type==='closing';
 container.innerHTML=isCover?cover():`<div class="diagram-plate"><svg viewBox="0 0 792 710" role="img" aria-label="${esc(p.type==='theory'?p.full:p.caseTitle)}"><defs><pattern id="hatch" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 12L12 0" stroke="var(--diagram-ink)" stroke-width="1" opacity=".2"/></pattern></defs>${(functions[p.kind]||subjects)(p)}</svg></div>`;
 let video=null;if(p.kind==='case4'&&document.documentElement.dataset.film==='ready'){
 const box=document.createElement('div');box.className='architecture-film';box.innerHTML='<video autoplay muted playsinline loop preload="auto" poster="assets/sports-centre.jpg"><source src="assets/sports-centre.mp4" type="video/mp4"></video><div class="film-owner"><small>СОБСТВЕННИК</small><b>Город Н</b></div><div class="film-rights"><div><small>ОПЕРАТИВНОЕ УПРАВЛЕНИЕ</small><b>МБУ «Центр спорта»</b></div><div><small>АРЕНДА ЧАСТИ ПОМЕЩЕНИЯ</small><b>ООО «Линия»</b></div></div><div class="film-caption">Учебная визуализация. Архитектура условная.</div>';container.prepend(box);video=box.querySelector('video');container.classList.add('with-film');video.addEventListener('error',()=>{box.remove();container.classList.remove('with-film')});video.play().catch(()=>{});
 }else container.classList.remove('with-film');
 return {setPaused(v){container.classList.toggle('motion-paused',v);container.querySelectorAll('svg').forEach(s=>v?s.pauseAnimations?.():s.unpauseAnimations?.());if(video)v?video.pause():video.play().catch(()=>{});},dispose(){video?.pause();container.innerHTML='';container.classList.remove('with-film');}};
}
