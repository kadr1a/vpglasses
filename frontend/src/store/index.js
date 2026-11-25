import {create} from 'zustand';
export const useAuthStore=create(set=>({
 user:JSON.parse(localStorage.getItem('vp_user')||'null'),
 setAuth:(token,user)=>{localStorage.setItem('vp_token',token);localStorage.setItem('vp_user',JSON.stringify(user));set({user});},
 logout:()=>{localStorage.removeItem('vp_token');localStorage.removeItem('vp_user');set({user:null});}
}));
export const useCartStore=create(set=>({items:[],setItems:items=>set({items}),addGuest:item=>set(s=>({items:[...s.items,item]}))}));
export const useFavoritesStore=create(set=>({ids:JSON.parse(localStorage.getItem('vp_favorites')||'[]'),toggle:id=>set(s=>{const ids=s.ids.includes(id)?s.ids.filter(x=>x!==id):[...s.ids,id];localStorage.setItem('vp_favorites',JSON.stringify(ids));return {ids};})}));
export const useToastStore=create(set=>({message:'',show:message=>{set({message});setTimeout(()=>set({message:''}),2600);}}));
