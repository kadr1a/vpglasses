require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-me';
app.use(cors({ origin: process.env.CLIENT_URL ? [process.env.CLIENT_URL, 'http://localhost:5173'] : true }));
app.use(express.json({ limit: '8mb' }));
app.use('/api/auth', rateLimit({ windowMs: 15*60*1000, max: 100 }));

const asyncRoute = fn => (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const tokenFor = user => jwt.sign({id:user.id,role:user.role}, JWT_SECRET, {expiresIn:'7d'});
const publicUser = ({id,email,name,phone,role}) => ({id,email,name,phone,role});
const auth = asyncRoute(async(req,res,next)=>{
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/,'');
  if (!token) return res.status(401).json({error:'Требуется авторизация'});
  try { const data=jwt.verify(token,JWT_SECRET); req.user=await prisma.user.findUnique({where:{id:data.id}}); if(!req.user) throw new Error(); next(); }
  catch { return res.status(401).json({error:'Недействительный токен'}); }
});
const admin = (req,res,next)=>req.user?.role==='admin'?next():res.status(403).json({error:'Недостаточно прав'});
const validate = schema => (req,res,next)=>{const result=schema.safeParse(req.body); if(!result.success)return res.status(400).json({error:'Ошибка валидации',details:result.error.flatten()}); req.body=result.data; next();};
const frameSchema=z.object({
  brand:z.string().min(1),name:z.string().min(1),price:z.coerce.number().positive(),material:z.string(),shape:z.string(),color:z.string(),
  imageUrl:z.string().url(),description:z.string().optional(),isPopular:z.coerce.boolean().optional(),
  lensWidth:z.coerce.number().int().optional(),lensHeight:z.coerce.number().int().optional(),bridge:z.coerce.number().int().optional(),temple:z.coerce.number().int().optional(),category:z.string().optional()
});

app.get('/api/health',(req,res)=>res.json({status:'ok'}));
app.post('/api/auth/register',validate(z.object({email:z.string().email(),password:z.string().min(6),name:z.string().min(2),phone:z.string().optional()})),asyncRoute(async(req,res)=>{
  const exists=await prisma.user.findUnique({where:{email:req.body.email}}); if(exists)return res.status(409).json({error:'Email уже зарегистрирован'});
  const user=await prisma.user.create({data:{...req.body,password:await bcrypt.hash(req.body.password,10)}});
  res.status(201).json({token:tokenFor(user),user:publicUser(user)});
}));
app.post('/api/auth/login',validate(z.object({email:z.string().email(),password:z.string().min(1)})),asyncRoute(async(req,res)=>{
  const user=await prisma.user.findUnique({where:{email:req.body.email}});
  if(!user || !(await bcrypt.compare(req.body.password,user.password)))return res.status(401).json({error:'Неверный email или пароль'});
  res.json({token:tokenFor(user),user:publicUser(user)});
}));
app.get('/api/auth/me',auth,(req,res)=>res.json({user:publicUser(req.user)}));
app.patch('/api/auth/me',auth,validate(z.object({name:z.string().min(2).optional(),phone:z.string().optional()})),asyncRoute(async(req,res)=>{
  const user=await prisma.user.update({where:{id:req.user.id},data:req.body});res.json({user:publicUser(user)});
}));

app.get('/api/frames',asyncRoute(async(req,res)=>{
  const {q,category,brands,materials,shapes,colors,minPrice,maxPrice,sort='new',page='1',limit='20'}=req.query;
  const where={};
  if(q)where.OR=[{name:{contains:q,mode:'insensitive'}},{brand:{contains:q,mode:'insensitive'}}];
  if(category && category!=='Все')where.category=category;
  if(brands)where.brand={in:String(brands).split(',')};
  if(materials)where.material={in:String(materials).split(',')};
  if(shapes)where.shape={in:String(shapes).split(',')};
  if(colors)where.color={in:String(colors).split(',')};
  if(minPrice||maxPrice)where.price={...(minPrice?{gte:Number(minPrice)}:{}),...(maxPrice?{lte:Number(maxPrice)}:{})};
  const orderBy=sort==='cheap'?{price:'asc'}:sort==='expensive'?{price:'desc'}:sort==='popular'?{isPopular:'desc'}:{createdAt:'desc'};
  const p=Math.max(1,Number(page)||1), take=Math.min(50,Math.max(1,Number(limit)||20));
  const [items,total]=await Promise.all([prisma.frame.findMany({where,orderBy,skip:(p-1)*take,take}),prisma.frame.count({where})]);
  res.json({items,total,page:p,pages:Math.ceil(total/take)});
}));
app.get('/api/frames/:id',asyncRoute(async(req,res)=>{const item=await prisma.frame.findUnique({where:{id:Number(req.params.id)}});if(!item)return res.status(404).json({error:'Оправа не найдена'});res.json(item)}));
app.get('/api/lenses/options',asyncRoute(async(req,res)=>{const [brands,types,thickness]=await Promise.all([prisma.lensBrand.findMany(),prisma.lensType.findMany(),prisma.lensThickness.findMany()]);res.json({brands,types,thickness})}));

app.get('/api/favorites',auth,asyncRoute(async(req,res)=>res.json(await prisma.favorite.findMany({where:{userId:req.user.id},include:{frame:true}}))));
app.post('/api/favorites/:frameId',auth,asyncRoute(async(req,res)=>{const frameId=Number(req.params.frameId);await prisma.favorite.upsert({where:{userId_frameId:{userId:req.user.id,frameId}},update:{},create:{userId:req.user.id,frameId}});res.json({ok:true})}));
app.delete('/api/favorites/:frameId',auth,asyncRoute(async(req,res)=>{await prisma.favorite.deleteMany({where:{userId:req.user.id,frameId:Number(req.params.frameId)}});res.json({ok:true})}));

app.get('/api/cart',auth,asyncRoute(async(req,res)=>res.json(await prisma.cartItem.findMany({where:{userId:req.user.id},include:{frame:true}}))));
app.post('/api/cart',auth,validate(z.object({frameId:z.number().int(),lensConfig:z.any().optional(),quantity:z.number().int().min(1).default(1)})),asyncRoute(async(req,res)=>{
  const frame=await prisma.frame.findUnique({where:{id:req.body.frameId}});if(!frame)return res.status(404).json({error:'Оправа не найдена'});
  const item=await prisma.cartItem.create({data:{userId:req.user.id,...req.body}});res.status(201).json(item);
}));
app.put('/api/cart/:id',auth,validate(z.object({quantity:z.number().int().min(1)})),asyncRoute(async(req,res)=>{
  const item=await prisma.cartItem.findFirst({where:{id:Number(req.params.id),userId:req.user.id}});if(!item)return res.status(404).json({error:'Позиция не найдена'});
  res.json(await prisma.cartItem.update({where:{id:item.id},data:req.body}));
}));
app.delete('/api/cart/:id',auth,asyncRoute(async(req,res)=>{await prisma.cartItem.deleteMany({where:{id:Number(req.params.id),userId:req.user.id}});res.json({ok:true})}));

app.post('/api/orders/checkout',auth,validate(z.object({customerName:z.string().min(2),phone:z.string().min(5),email:z.string().email(),deliveryAddress:z.string().min(5)})),asyncRoute(async(req,res)=>{
  const cart=await prisma.cartItem.findMany({where:{userId:req.user.id},include:{frame:true}});
  if(!cart.length)return res.status(400).json({error:'Корзина пуста'});
  const order=await prisma.$transaction(async tx=>{
    const total=cart.reduce((s,i)=>s+(i.frame?.price||0)*(i.quantity)+(i.lensConfig?.lensPrice||0)*i.quantity,0);
    const created=await tx.order.create({data:{userId:req.user.id,total,...req.body,items:{create:cart.map(i=>({
      frameId:i.frameId,quantity:i.quantity,priceAtTime:(i.frame?.price||0)+(i.lensConfig?.lensPrice||0),
      lensBrandId:i.lensConfig?.brandId||null,lensTypeId:i.lensConfig?.typeId||null,lensThicknessId:i.lensConfig?.thicknessId||null,
      prescriptionData:i.lensConfig||undefined
    }))}},include:{items:{include:{frame:true}}}});
    await tx.cartItem.deleteMany({where:{userId:req.user.id}});return created;
  });
  res.status(201).json(order);
}));
app.get('/api/orders/my',auth,asyncRoute(async(req,res)=>res.json(await prisma.order.findMany({where:{userId:req.user.id},orderBy:{createdAt:'desc'},include:{items:{include:{frame:true}}}}))));

app.get('/api/admin/frames',auth,admin,asyncRoute(async(req,res)=>res.json(await prisma.frame.findMany({orderBy:{id:'desc'}}))));
app.post('/api/admin/frames',auth,admin,validate(frameSchema),asyncRoute(async(req,res)=>res.status(201).json(await prisma.frame.create({data:req.body}))));
app.put('/api/admin/frames/:id',auth,admin,validate(frameSchema.partial()),asyncRoute(async(req,res)=>res.json(await prisma.frame.update({where:{id:Number(req.params.id)},data:req.body}))));
app.delete('/api/admin/frames/:id',auth,admin,asyncRoute(async(req,res)=>{await prisma.frame.delete({where:{id:Number(req.params.id)}});res.json({ok:true})}));
app.get('/api/admin/orders',auth,admin,asyncRoute(async(req,res)=>res.json(await prisma.order.findMany({orderBy:{createdAt:'desc'},include:{items:{include:{frame:true}}}}))));
app.patch('/api/admin/orders/:id/status',auth,admin,validate(z.object({status:z.enum(['processing','shipped','delivered','cancelled'])})),asyncRoute(async(req,res)=>res.json(await prisma.order.update({where:{id:Number(req.params.id)},data:{status:req.body.status}}))));
app.get('/api/admin/users',auth,admin,asyncRoute(async(req,res)=>res.json(await prisma.user.findMany({select:{id:true,email:true,name:true,phone:true,role:true,createdAt:true}}))));
app.get('/api/admin/reports/brand-frames',auth,admin,asyncRoute(async(req,res)=>res.json(await prisma.frame.groupBy({by:['brand'],_count:{id:true},orderBy:{brand:'asc'}}))));
app.get('/api/admin/reports/popular',auth,admin,asyncRoute(async(req,res)=>{
  const grouped=await prisma.orderItem.groupBy({by:['frameId'],_sum:{quantity:true},orderBy:{_sum:{quantity:'desc'}},take:10});
  const ids=grouped.map(x=>x.frameId).filter(Boolean);const frames=await prisma.frame.findMany({where:{id:{in:ids}}});
  res.json(grouped.map(g=>({...g,frame:frames.find(f=>f.id===g.frameId)})));
}));
app.get('/api/admin/reports/lens-type',auth,admin,asyncRoute(async(req,res)=>{
  const type=await prisma.lensType.findUnique({where:{name:String(req.query.name||'Фотохромные')}});
  if(!type)return res.json([]);res.json(await prisma.orderItem.findMany({where:{lensTypeId:type.id},include:{order:true,frame:true}}));
}));
app.get('/api/admin/reports/average',auth,admin,asyncRoute(async(req,res)=>{
  const orders=await prisma.order.findMany({select:{total:true}});const avg=orders.length?orders.reduce((s,o)=>s+o.total,0)/orders.length:0;
  res.json({count:orders.length,average:Number(avg.toFixed(2)),total:orders.reduce((s,o)=>s+o.total,0)});
}));
app.get('/api/admin/reports/never-ordered',auth,admin,asyncRoute(async(req,res)=>{
  const used=await prisma.orderItem.findMany({where:{frameId:{not:null}},select:{frameId:true},distinct:['frameId']});
  res.json(await prisma.frame.findMany({where:{id:{notIn:used.map(x=>x.frameId)}}}));
}));
app.get('/api/admin/reports/all',auth,admin,asyncRoute(async(req,res)=>{
  const [frames,orders,users]=await Promise.all([prisma.frame.count(),prisma.order.count(),prisma.user.count()]);res.json({frames,orders,users});
}));

app.use((err,req,res,next)=>{console.error(err);res.status(err.code==='P2025'?404:500).json({error:err.code==='P2025'?'Запись не найдена':'Внутренняя ошибка сервера'});});
app.listen(PORT,()=>console.log(`VP Glasses API listening on ${PORT}`));
