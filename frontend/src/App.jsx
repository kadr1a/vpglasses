import {Navigate,Route,Routes} from 'react-router-dom';
import {Shell} from './components/Layout';
import {useAuthStore} from './store';
import {Catalog,FramePage,Login,Cart,Checkout,Profile,Admin} from './pages/Pages';
function Protected({children,admin=false}){const user=useAuthStore(s=>s.user);if(!user)return <Navigate to="/login" replace/>;if(admin&&user.role!=='admin')return <Navigate to="/" replace/>;return children;}
export default function App(){return <Shell><Routes><Route path="/" element={<Catalog/>}/><Route path="/frames/:id" element={<FramePage/>}/><Route path="/login" element={<Login/>}/><Route path="/register" element={<Login/>}/><Route path="/cart" element={<Cart/>}/><Route path="/checkout" element={<Protected><Checkout/></Protected>}/><Route path="/profile" element={<Protected><Profile/></Protected>}/><Route path="/admin" element={<Protected admin><Admin/></Protected>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></Shell>}
