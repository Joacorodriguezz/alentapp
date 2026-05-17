import {
  Table,
  Button,
  Heading,
  HStack,
  Stack,
  Text,
  Box,
  Flex,
  Spinner,
  Center,
  Input,
  Textarea,
} from "@chakra-ui/react";
import { LuPlus, LuRefreshCw, LuPencil } from "react-icons/lu";
import { useEffect, useState } from "react";
import { paymentsService } from "../services/payments";
import type { PaymentDTO, CreatePaymentRequest, PaymentFilters, PaymentStatus, UpdatePaymentRequest } from "@alentapp/shared";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogActionTrigger,
  DialogCloseTrigger,
} from "../components/ui/dialog";
import { Field } from "../components/ui/field";
import {
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
  createListCollection,
} from "../components/ui/select";

const statusColors: Record<string, { bg: string; color: string }> = {
  Pending:  { bg: "yellow.50", color: "yellow.700" },
  Paid:     { bg: "green.50",  color: "green.700"  },
  Canceled: { bg: "red.50",   color: "red.700"    },
};

const statusLabels: Record<string, string> = {
  Pending:  "Pendiente",
  Paid:     "Pagado",
  Canceled: "Cancelado",
};

const statusOptions = createListCollection({
  items: [
    { label: "Todos", value: "" },
    { label: "Pendiente", value: "Pending" },
    { label: "Pagado", value: "Paid" },
    { label: "Cancelado", value: "Canceled" },
  ],
});

const editStatusOptions = createListCollection({
  items: [
    { label: "Pendiente", value: "Pending" },
    { label: "Pagado", value: "Paid" },
  ],
});

type DialogMode = "create" | "detail" | "edit";

export function PaymentsView() {
  const [payments, setPayments] = useState<PaymentDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<PaymentFilters>({});

  const [dialogMode, setDialogMode] = useState<DialogMode>("create");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDTO | null>(null);

  const [formData, setFormData] = useState<CreatePaymentRequest>({
    amount: 0,
    description: "",
    paymentDate: "",
    memberId: "",
  });

  const [editFormData, setEditFormData] = useState<{ amount: string; description: string; status: string }>({
    amount: "",
    description: "",
    status: "",
  });

  const fetchPayments = async (activeFilters?: PaymentFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await paymentsService.getAll(activeFilters ?? filters);
      setPayments(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar los pagos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilters: PaymentFilters) => {
    setFilters(newFilters);
    fetchPayments(newFilters);
  };

  const openCreateModal = () => {
    setFormData({ amount: 0, description: "", paymentDate: "", memberId: "" });
    setDialogMode("create");
    setIsDialogOpen(true);
  };

  const openDetailModal = (payment: PaymentDTO) => {
    setSelectedPayment(payment);
    setDialogMode("detail");
    setIsDialogOpen(true);
  };

  const openEditModal = (payment: PaymentDTO) => {
    setSelectedPayment(payment);
    setEditFormData({
      amount: payment.amount.toString(),
      description: payment.description ?? "",
      status: payment.status,
    });
    setDialogMode("edit");
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await paymentsService.create(formData);
      setIsDialogOpen(false);
      fetchPayments();
    } catch (err: any) {
      alert(err.message || "Error al registrar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setIsSubmitting(true);
    try {
      const payload: UpdatePaymentRequest = {};
      if (selectedPayment.status === "Pending" && editFormData.amount !== "") {
        payload.amount = parseFloat(editFormData.amount);
      }
      if (editFormData.description !== (selectedPayment.description ?? "")) {
        payload.description = editFormData.description;
      }
      if (editFormData.status === "Paid" && selectedPayment.status === "Pending") {
        payload.status = "Paid";
      }
      await paymentsService.update(selectedPayment.id, payload);
      setIsDialogOpen(false);
      fetchPayments();
    } catch (err: any) {
      alert(err.message || "Error al actualizar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Administración de Pagos</Heading>
            <Text color="fg.muted" fontSize="md">
              Registra y consulta los pagos de cuotas y servicios de los socios.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={() => fetchPayments()} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Registrar Pago
            </Button>
          </HStack>
        </Flex>

        {/* Dialog: Registrar pago, Ver detalle o Editar */}
        <DialogContent>
          {dialogMode === "create" ? (
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Pago</DialogTitle>
              </DialogHeader>
              <DialogBody>
                <Stack gap="4">
                  <Field label="Monto" required>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ej. 1500.00"
                      value={formData.amount || ""}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                      required
                    />
                  </Field>
                  <Field label="Descripción">
                    <Textarea
                      placeholder="Ej. Cuota mensual enero"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </Field>
                  <Field label="Fecha de Pago" required>
                    <Input
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="ID del Socio" required>
                    <Input
                      placeholder="UUID del socio"
                      value={formData.memberId}
                      onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                      required
                    />
                  </Field>
                </Stack>
              </DialogBody>
              <DialogFooter>
                <DialogActionTrigger asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogActionTrigger>
                <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                  Registrar Pago
                </Button>
              </DialogFooter>
              <DialogCloseTrigger />
            </form>
          ) : dialogMode === "detail" ? (
            <>
              <DialogHeader>
                <DialogTitle>Detalle del Pago</DialogTitle>
              </DialogHeader>
              <DialogBody>
                {selectedPayment && (
                  <Stack gap="3">
                    <Flex justify="space-between">
                      <Text fontWeight="semibold" color="fg.muted">ID</Text>
                      <Text fontSize="xs" fontFamily="mono">{selectedPayment.id}</Text>
                    </Flex>
                    <Flex justify="space-between">
                      <Text fontWeight="semibold" color="fg.muted">Monto</Text>
                      <Text fontWeight="bold">${selectedPayment.amount.toFixed(2)}</Text>
                    </Flex>
                    <Flex justify="space-between">
                      <Text fontWeight="semibold" color="fg.muted">Descripción</Text>
                      <Text>{selectedPayment.description ?? "-"}</Text>
                    </Flex>
                    <Flex justify="space-between" align="center">
                      <Text fontWeight="semibold" color="fg.muted">Estado</Text>
                      <Box
                        display="inline-block"
                        px="2"
                        py="0.5"
                        borderRadius="md"
                        bg={statusColors[selectedPayment.status]?.bg}
                        color={statusColors[selectedPayment.status]?.color}
                        fontSize="xs"
                        fontWeight="bold"
                      >
                        {statusLabels[selectedPayment.status] ?? selectedPayment.status}
                      </Box>
                    </Flex>
                    <Flex justify="space-between">
                      <Text fontWeight="semibold" color="fg.muted">Fecha de Pago</Text>
                      <Text>{new Date(selectedPayment.paymentDate).toLocaleDateString("es-AR")}</Text>
                    </Flex>
                    <Flex justify="space-between">
                      <Text fontWeight="semibold" color="fg.muted">Socio ID</Text>
                      <Text fontSize="xs" fontFamily="mono">{selectedPayment.memberId}</Text>
                    </Flex>
                    <Flex justify="space-between">
                      <Text fontWeight="semibold" color="fg.muted">Creado</Text>
                      <Text>{new Date(selectedPayment.createdAt).toLocaleString("es-AR")}</Text>
                    </Flex>
                    <Flex justify="space-between">
                      <Text fontWeight="semibold" color="fg.muted">Actualizado</Text>
                      <Text>{new Date(selectedPayment.updatedAt).toLocaleString("es-AR")}</Text>
                    </Flex>
                  </Stack>
                )}
              </DialogBody>
              <DialogFooter>
                <DialogActionTrigger asChild>
                  <Button variant="outline">Cerrar</Button>
                </DialogActionTrigger>
              </DialogFooter>
              <DialogCloseTrigger />
            </>
          ) : (
            <form onSubmit={handleUpdateSubmit}>
              <DialogHeader>
                <DialogTitle>Editar Pago</DialogTitle>
              </DialogHeader>
              <DialogBody>
                <Stack gap="4">
                  <Field label="Monto">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ej. 1500.00"
                      value={editFormData.amount}
                      onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                      disabled={selectedPayment?.status !== "Pending"}
                    />
                    {selectedPayment?.status !== "Pending" && (
                      <Text fontSize="xs" color="fg.muted">El monto solo puede modificarse si el pago está pendiente.</Text>
                    )}
                  </Field>
                  <Field label="Descripción">
                    <Textarea
                      placeholder="Ej. Cuota mensual enero"
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    />
                  </Field>
                  {selectedPayment?.status === "Pending" && (
                    <Field label="Estado">
                      <SelectRoot
                        collection={editStatusOptions}
                        value={[editFormData.status]}
                        onValueChange={(e) => setEditFormData({ ...editFormData, status: e.value[0] as PaymentStatus })}
                      >
                        <SelectTrigger>
                          <SelectValueText placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {editStatusOptions.items.map((opt) => (
                            <SelectItem item={opt} key={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </SelectRoot>
                    </Field>
                  )}
                </Stack>
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogMode("detail")} type="button">
                  Volver
                </Button>
                <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                  Guardar Cambios
                </Button>
              </DialogFooter>
              <DialogCloseTrigger />
            </form>
          )}
        </DialogContent>

        {/* Filtros */}
        <HStack gap="4" align="flex-end">
          <Box flex="1">
            <Text fontSize="sm" fontWeight="medium" mb="1" color="fg.muted">Filtrar por Socio ID</Text>
            <Input
              placeholder="UUID del socio"
              value={filters.memberId ?? ""}
              onChange={(e) => handleFilterChange({ ...filters, memberId: e.target.value || undefined })}
            />
          </Box>
          <Box w="200px">
            <Text fontSize="sm" fontWeight="medium" mb="1" color="fg.muted">Filtrar por Estado</Text>
            <SelectRoot
              collection={statusOptions}
              value={[filters.status ?? ""]}
              onValueChange={(e) =>
                handleFilterChange({ ...filters, status: (e.value[0] as PaymentStatus) || undefined })
              }
            >
              <SelectTrigger>
                <SelectValueText placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.items.map((opt) => (
                  <SelectItem item={opt} key={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          </Box>
        </HStack>

        {error && (
          <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
            <Text fontWeight="bold">Error:</Text>
            <Text>{error}</Text>
          </Box>
        )}

        <Box
          bg="bg.panel"
          borderRadius="xl"
          boxShadow="sm"
          borderWidth="1px"
          overflow="hidden"
          minH="300px"
          position="relative"
        >
          {isLoading ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Spinner size="xl" color="blue.500" />
                <Text color="fg.muted">Cargando pagos...</Text>
              </Stack>
            </Center>
          ) : payments.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No se encontraron pagos.</Text>
                <Button variant="ghost" onClick={() => fetchPayments()}>Reintentar</Button>
              </Stack>
            </Center>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Monto</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Descripción</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Estado</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Fecha de Pago</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Socio ID</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Acciones</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {payments.map((payment) => (
                  <Table.Row
                    key={payment.id}
                    _hover={{ bg: "bg.muted/30" }}
                    cursor="pointer"
                    onClick={() => openDetailModal(payment)}
                  >
                    <Table.Cell fontWeight="semibold" color="fg.emphasized">
                      ${payment.amount.toFixed(2)}
                    </Table.Cell>
                    <Table.Cell color="fg.muted">{payment.description ?? "-"}</Table.Cell>
                    <Table.Cell>
                      <Box
                        display="inline-block"
                        px="2"
                        py="0.5"
                        borderRadius="md"
                        bg={statusColors[payment.status]?.bg}
                        color={statusColors[payment.status]?.color}
                        fontSize="xs"
                        fontWeight="bold"
                      >
                        {statusLabels[payment.status] ?? payment.status}
                      </Box>
                    </Table.Cell>
                    <Table.Cell color="fg.muted">
                      {new Date(payment.paymentDate).toLocaleDateString("es-AR")}
                    </Table.Cell>
                    <Table.Cell color="fg.muted" fontSize="xs">
                      {payment.memberId}
                    </Table.Cell>
                    <Table.Cell>
                      {payment.status !== "Canceled" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); openEditModal(payment); }}
                          aria-label="Editar pago"
                        >
                          <LuPencil />
                        </Button>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </Stack>
    </DialogRoot>
  );
}
