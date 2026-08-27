import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder, approveOrder } from '../../../../api/orders';
import { useAdminAuth } from '../../../../components/auth/useAdminAuth';
import { ADMIN_ROUTES } from '../../../../lib/routes';
import type { Product } from '../../../../types';
import {
  DEFAULT_COUNTER_CLIENT,
  type CustomerForm,
  type FormErrors,
  type SelectedOrderItem,
  sanitizeName,
  validateNameField,
  validateCedulaField,
  validatePhoneField,
  normalizeCedula,
  normalizePhone,
} from './createOrderConstants';

export function useAdminOrderCreator() {
  const navigate = useNavigate();
  const { getAdminToken } = useAdminAuth();

  const auth = useMemo(
    () => (getAdminToken ? { getToken: getAdminToken } : undefined),
    [getAdminToken],
  );

  const [customer, setCustomer] = useState<CustomerForm>({
    name: '',
    last_name: '',
    cedula: '',
    tlf_num: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [deliveryType, setDeliveryType] = useState<string>('retiro_tienda');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [autoApprove, setAutoApprove] = useState<boolean>(true);
  const [selectedItems, setSelectedItems] = useState<SelectedOrderItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const handleQuickFillCounter = useCallback(() => {
    setCustomer(DEFAULT_COUNTER_CLIENT);
    setErrors({});
    setDeliveryType('retiro_tienda');
    setPaymentMethod('cash');
  }, []);

  const handleCustomerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      let sanitized = value;
      if (name === 'name' || name === 'last_name') {
        sanitized = sanitizeName(value);
      }
      setCustomer((prev) => ({ ...prev, [name]: sanitized }));

      if (name === 'name') {
        setErrors((prev) => ({ ...prev, name: validateNameField(sanitized, 'Nombre') }));
      } else if (name === 'last_name') {
        setErrors((prev) => ({ ...prev, last_name: validateNameField(sanitized, 'Apellido') }));
      } else if (name === 'cedula') {
        setErrors((prev) => ({ ...prev, cedula: validateCedulaField(sanitized) }));
      } else if (name === 'tlf_num') {
        setErrors((prev) => ({ ...prev, tlf_num: validatePhoneField(sanitized) }));
      }
    },
    [],
  );

  const handleAddItem = useCallback((product: Product) => {
    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.product.product_id === product.product_id);
      if (existing) {
        return prev.map((i) =>
          i.product.product_id === product.product_id
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const handleIncrement = useCallback((productId: number) => {
    setSelectedItems((prev) =>
      prev.map((i) =>
        i.product.product_id === productId
          ? { ...i, quantity: i.quantity + 1 }
          : i,
      ),
    );
  }, []);

  const handleDecrement = useCallback((productId: number) => {
    setSelectedItems((prev) => {
      const next: SelectedOrderItem[] = [];
      for (const item of prev) {
        if (item.product.product_id === productId) {
          if (item.quantity > 1) {
            next.push({ ...item, quantity: item.quantity - 1 });
          }
        } else {
          next.push(item);
        }
      }
      return next;
    });
  }, []);

  const handleUpdateQty = useCallback((productId: number, qty: number) => {
    if (qty <= 0) {
      setSelectedItems((prev) =>
        prev.filter((i) => i.product.product_id !== productId),
      );
      return;
    }
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.product.product_id === productId ? { ...item, quantity: qty } : item,
      ),
    );
  }, []);

  const handleRemove = useCallback((productId: number) => {
    setSelectedItems((prev) =>
      prev.filter((i) => i.product.product_id !== productId),
    );
  }, []);

  const selectedQtyMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of selectedItems) {
      map.set(item.product.product_id, item.quantity);
    }
    return map;
  }, [selectedItems]);

  const totalAmount = useMemo(() => {
    return selectedItems.reduce(
      (sum, item) => sum + Number(item.product.product_price) * item.quantity,
      0,
    );
  }, [selectedItems]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;

      if (selectedItems.length === 0) {
        showToast('Selecciona al menos un producto para registrar el pedido.');
        return;
      }

      const nameErr = validateNameField(customer.name, 'Nombre');
      const lastNameErr = validateNameField(customer.last_name, 'Apellido');
      const cedulaErr = validateCedulaField(customer.cedula);
      const phoneErr = validatePhoneField(customer.tlf_num);

      const nextErrors: FormErrors = {
        name: nameErr || undefined,
        last_name: lastNameErr || undefined,
        cedula: cedulaErr || undefined,
        tlf_num: phoneErr || undefined,
      };

      setErrors(nextErrors);

      if (nameErr || lastNameErr || cedulaErr || phoneErr) {
        showToast('Por favor corrige los datos del cliente antes de registrar el pedido.');
        return;
      }

      setIsSubmitting(true);
      try {
        const payload = {
          client_info: {
            name: customer.name.trim(),
            last_name: customer.last_name.trim(),
            cedula: normalizeCedula(customer.cedula),
            tlf_num: normalizePhone(customer.tlf_num),
          },
          delivery_type: deliveryType,
          payment_method: paymentMethod,
          items: selectedItems.map((item) => ({
            product_id: item.product.product_id,
            product_qty: item.quantity,
          })),
        };

        const result = await createOrder(payload);

        if (!result.ok) {
          showToast(result.message || 'Error al registrar el pedido');
          return;
        }

        const createdOrder = result.data;

        if (autoApprove && createdOrder?.order_id) {
          await approveOrder(createdOrder.order_id, auth);
        }

        navigate(ADMIN_ROUTES.orderDetail(createdOrder.order_id), {
          state: { message: 'Pedido registrado con éxito' },
        });
      } catch (err) {
        console.error('Error al registrar pedido admin:', err);
        showToast('Ocurrió un error inesperado al procesar el pedido.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      auth,
      autoApprove,
      customer,
      deliveryType,
      isSubmitting,
      navigate,
      paymentMethod,
      selectedItems,
      showToast,
    ],
  );

  return {
    customer,
    errors,
    deliveryType,
    paymentMethod,
    autoApprove,
    selectedItems,
    selectedQtyMap,
    totalAmount,
    isSubmitting,
    toast,
    setDeliveryType,
    setPaymentMethod,
    setAutoApprove,
    handleQuickFillCounter,
    handleCustomerChange,
    handleAddItem,
    handleIncrement,
    handleDecrement,
    handleUpdateQty,
    handleRemove,
    handleSubmit,
  };
}
