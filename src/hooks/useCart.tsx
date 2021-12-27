import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const localStorageName = '@RocketShoes:cart';

  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(localStorageName);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  async function getStockProduct(productId: number) {
    const response = await api.get(`/stock/${productId}`)
    const stock = await response.data as Stock;

    return stock;
  }

  async function getProduct(productId: number) {
    const response = await api.get(`/products/${productId}`)
    const products = await response.data as Product;

    return products;
  }

  const addProduct = async (productId: number) => {
    try {

      const stockProduct = await getStockProduct(productId);
      const productCart = cart.find(x => x.id === productId)

      let amount = productCart === undefined
        ? 1
        : productCart.amount + 1;


      if (stockProduct.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      if (productCart === undefined) {
        const product = await getProduct(productId);
        cart.push({
          ...product,
          amount: amount
        })
      } else {
        productCart.amount = amount
      }


      const chartUpdated = [
        ...cart
      ]

      localStorage.setItem(localStorageName, JSON.stringify(chartUpdated))
      setCart(chartUpdated)

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(x => x.id === productId);
      if (product === undefined) {
        throw new Error("Produto Inexistente")
      }
      const updateChart = cart.filter(x => x.id !== productId)
      localStorage.setItem(localStorageName, JSON.stringify(updateChart));

      setCart(
        [
          ...updateChart
        ]
      )

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if (amount <= 0)
        return

      const stock = await getStockProduct(productId);

      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }


      const productCart = cart.find(x => x.id === productId);

      if (productCart === undefined)
        return

      productCart.amount = amount;

      localStorage.setItem(localStorageName, JSON.stringify(cart))
      setCart([...cart])

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
