import {useMemo,useState} from 'react';
import api from '../api/client';
import {useToastStore} from '../store';
const purposes=['Для дали','Для близи (для чтения)','Прогрессивные','Для защиты от солнца','Для вождения','Компьютерные','Имиджевые'];
const types=['Прозрачные (стандартные)','Компьютерные (защита от синего света)','Фотохромные (хамелеон)','Солнцезащитные (тонированные)','Для вождения (поляризация)'];
const thickness=['Базовый пластик (1.5)','Утончённый пластик (1.6)','Ультратонкие (1.67 или 1.74)','Минеральные (стекло)'];
const brands=['Essilor','Hoya','Zeiss','Nikon'];
const addPrice=(v)=>({[types[0]]:2500,[types[1]]:3900,[types[2]]:5200,[types[3]]:4200,[types[4]]:5900}[v]||2500);
const thickPrice=(v)=>({[thickness[0]]:0,[thickness[1]]:1800,[thickness[2]]:3500,[thickness[3]]:1200}[v]||0);
export default function LensConstructor({frame,onClose,onAdd}){
 const [step,setStep]=useState(0),[purpose,setPurpose]=useState('Для дали'),[rx,setRx]=useState({od:{sph:'',cyl:'',axi:'',add:''},os:{sph:'',cyl:'',axi:'',add:''},pd:''}),[type,setType]=useState(types[0]),[thick,setThick]=useState(thickness[0]),[brand,setBrand]=useState(brands[0]),[file,setFile]=useState(null);
 const [saving,setSaving]=useState(false);const toast=useToastStore(s=>s.show);
 const steps=purpose==='Имиджевые'?['Назначение','Тип линз','Толщина','Бренд','Итог']:['Назначение','Рецепт','Тип линз','Толщина','Бренд','Итог'];
 const actualStep=purpose==='Имиджевые'&&step>0?step+1:step;
 const lensPrice=purpose==='Имиджевые'?0:addPrice(type)+thickPrice(thick);
 const validRx=()=>{const nums=[rx.od.sph,rx.od.cyl,rx.os.sph,rx.os.cyl,rx.pd].filter(x=>x!=='').every(x=>Number.isFinite(Number(x))&&Number(x)>=-30&&Number(x)<=30);return nums&&Number(rx.pd)>0&&Number(rx.pd)<=80&&[rx.od.axi,rx.os.axi].every(x=>x===''||(Number(x)>=0&&Number(x)<=180));};
 const next=()=>{if(step===0&&purpose!=='Имиджевые'){setStep(1);return;}if(step===1&&purpose!=='Имиджевые'&&!validRx()){toast('Проверьте рецепт и межзрачковое расстояние');return;}if(step<steps.length-1)setStep(step+1);};
 const config={purpose,rx:purpose==='Имиджевые'?null:rx,type,thickness:thick,brand,lensPrice,fileName:file?.name||null};
 const finish=()=>onAdd(config);
 const selectList=(values,value,set)=> <div className="option-grid">{values.map(v=><button key={v} className={`option ${value===v?'selected':''}`} onClick={()=>set(v)}>{v}</button>)}</div>;
 const eye=(key,label)=><div className="eye-card"><b>{label}</b><div className="rx-grid">{['sph','cyl','axi',...(purpose==='Прогрессивные'?['add']:[])].map(k=><label>{k.toUpperCase()}<input type="number" step=".25" value={rx[key][k]} onChange={e=>setRx(s=>({...s,[key]:{...s[key],[k]:e.target.value}}))} placeholder="0.00"/></label>)}</div></div>;
 return <div className="modal-backdrop"><section className="constructor modal"><button className="modal-close" onClick={onClose}>×</button><div className="eyebrow">ИНДИВИДУАЛЬНАЯ НАСТРОЙКА</div><h2>Конструктор линз</h2><div className="steps">{steps.map((s,i)=><span className={(i<=step?'done':'')}>{i+1}. {s}</span>)}</div>
 {actualStep===0&&<><h3>Для чего вам очки?</h3>{selectList(purposes,purpose,setPurpose)}</>}
 {actualStep===1&&<><h3>Введите параметры рецепта</h3><p className="muted">Значения можно уточнить у офтальмолога. Конструктор не заменяет проверку рецепта специалистом.</p>{eye('od','Правый глаз · OD')}{eye('os','Левый глаз · OS')}<label className="field">Межзрачковое расстояние (PD), мм<input type="number" step=".5" value={rx.pd} onChange={e=>setRx(s=>({...s,pd:e.target.value}))} placeholder="Например, 64"/></label><label className="field">Загрузить рецепт (PDF или изображение)<input type="file" accept=".pdf,image/*" onChange={e=>setFile(e.target.files[0])}/></label></>}
 {actualStep===2&&<><h3>Тип линз</h3>{selectList(types,type,setType)}</>}
 {actualStep===3&&<><h3>Толщина и материал</h3>{selectList(thickness,thick,setThick)}</>}
 {actualStep===4&&<><h3>Бренд линз</h3>{selectList(brands,brand,setBrand)}</>}
 {actualStep===5&&<><h3>Ваша конфигурация</h3><div className="summary"><p>Назначение: <b>{purpose}</b></p><p>Тип: <b>{type}</b></p><p>Материал: <b>{thick}</b></p><p>Бренд: <b>{brand}</b></p>{file&&<p>Рецепт: <b>{file.name}</b> (имя файла сохраняется в заказе; файл не отправляется)</p>}<hr/><p>Оправа: {frame.price.toLocaleString('ru-RU')} ₽</p><p>Линзы: {lensPrice.toLocaleString('ru-RU')} ₽</p><h2>{(frame.price+lensPrice).toLocaleString('ru-RU')} ₽</h2></div></>}
 <div className="modal-actions">{step>0&&<button className="btn secondary" onClick={()=>setStep(step-1)}>Назад</button>}{step<steps.length-1?<button className="btn" onClick={next}>Продолжить</button>:<button className="btn" onClick={finish}>Добавить в корзину</button>}</div>
 </section></div>;
}
