import {
  Table,
  Button,
  Heading,
  HStack,
  IconButton,
  Stack,
  Text,
  Box,
  Flex,
  Input,
} from "@chakra-ui/react";
import { LuPlus, LuPencil, LuRefreshCw, LuTrash2 } from "react-icons/lu";
import { useState, useEffect } from "react";
import { equipmentLoansService } from "../services/equipmentLoans";
import { membersService } from "../services/members";
import type { CreateEquipmentLoanRequest, UpdateEquipmentLoanRequest, EquipmentLoanResponse, EquipmentLoanStatus } from "@alentapp/shared";
import type { MemberDTO } from "@alentapp/shared";
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

const statusOptions = createListCollection({
  items: [
    { label: "Prestado", value: "Loaned" },
    { label: "Devuelto", value: "Returned" },
    { label: "Dañado", value: "Damaged" },
  ],
});

const statusColors: Record<string, { bg: string; color: string }> = {
  Loaned:   { bg: "blue.50",  color: "blue.700" },
  Returned: { bg: "green.50", color: "green.700" },
  Damaged:  { bg: "red.50",   color: "red.700" },
};

export function EquipmentLoansView() {
  const [loans, setLoans] = useState<EquipmentLoanResponse[]>([]);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Resuelve el DNI a partir del memberId almacenado en el préstamo
  const getDniByMemberId = (memberId: string): string => {
    const member = members.find((m) => m.id === memberId);
    return member ? member.dni : "—";
  };

  const fetchLoans = async () => {
    setIsLoading(true);
    try {
      const data = await equipmentLoansService.getAll();
      setLoans(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
    membersService.getAll().then(setMembers).catch(console.error);
  }, []);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [dniInput, setDniInput] = useState("");
  const [dniError, setDniError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateEquipmentLoanRequest & { status?: EquipmentLoanStatus }>({
    itemName: "",
    dueDate: "",
    memberId: "",
  });

  const openCreateModal = () => {
    setEditingLoanId(null);
    setFormData({ itemName: "", dueDate: "", memberId: "" });
    setDniInput("");
    setDniError(null);
    setIsDialogOpen(true);
  };

  const openEditModal = (loan: EquipmentLoanResponse) => {
    setEditingLoanId(loan.id);
    setFormData({
      itemName: loan.itemName,
      dueDate: loan.dueDate.split("T")[0],
      memberId: loan.memberId,
      status: loan.status as EquipmentLoanStatus,
    });
    setDniInput("");
    setDniError(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setDniError(null);

    try {
      if (editingLoanId) {
        const updated = await equipmentLoansService.update(editingLoanId, formData as UpdateEquipmentLoanRequest);
        setLoans(loans.map((l) => (l.id === editingLoanId ? updated : l)));
      } else {
        // Resolver el memberId a partir del DNI ingresado
        const member = members.find((m) => m.dni === dniInput.trim());
        if (!member) {
          setDniError("No se encontró ningún socio con ese DNI.");
          setIsSubmitting(false);
          return;
        }

        const payload: CreateEquipmentLoanRequest = {
          ...formData,
          memberId: member.id,
        };
        const created = await equipmentLoansService.create(payload);
        setLoans([created, ...loans]);
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      alert(err.message || "Error al guardar el préstamo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLoan = async (id: string, itemName: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el préstamo de "${itemName}"? Esta acción no se puede deshacer.`)) {
      try {
        await equipmentLoansService.delete(id);
        fetchLoans();
      } catch (err: any) {
        alert(err.message || "Error al eliminar el préstamo");
      }
    }
  };

  const isClosed = (status?: EquipmentLoanStatus) =>
    status === "Returned" || status === "Damaged";

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Administración de Préstamos</Heading>
            <Text color="fg.muted" fontSize="md">
              Registra los préstamos de equipamiento a los socios del club.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" size="md" onClick={fetchLoans} loading={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Registrar Préstamo
            </Button>
          </HStack>
        </Flex>

        {/* Modal para crear / editar préstamo */}
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingLoanId ? "Editar Préstamo" : "Registrar Nuevo Préstamo"}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field label="Nombre del Elemento" required={!editingLoanId}>
                  <Input
                    placeholder="Ej. Pelota de Básquet Spalding"
                    value={formData.itemName}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                    disabled={isClosed(formData.status)}
                    required={!editingLoanId}
                  />
                </Field>
                <Field label="Fecha de Devolución" required={!editingLoanId}>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    disabled={isClosed(formData.status)}
                    required={!editingLoanId}
                  />
                </Field>
                {!editingLoanId && (
                  <Field label="DNI del Socio" required>
                    <Input
                      placeholder="Ej. 40123456"
                      value={dniInput}
                      onChange={(e) => {
                        setDniInput(e.target.value);
                        setDniError(null);
                      }}
                      required
                    />
                    {dniError && (
                      <Text color="red.500" fontSize="sm" mt="1">
                        {dniError}
                      </Text>
                    )}
                  </Field>
                )}
                {editingLoanId && formData.status && (
                  <Field label="Estado">
                    <SelectRoot
                      collection={statusOptions}
                      value={[formData.status]}
                      onValueChange={(e) => setFormData({ ...formData, status: e.value[0] as EquipmentLoanStatus })}
                    >
                      <SelectTrigger>
                        <SelectValueText placeholder="Seleccione un estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.items.map((opt) => (
                          <SelectItem item={opt} key={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectRoot>
                  </Field>
                )}
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                {editingLoanId ? "Guardar Cambios" : "Registrar Préstamo"}
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>

        <Box
          bg="bg.panel"
          borderRadius="xl"
          boxShadow="sm"
          borderWidth="1px"
          overflow="hidden"
          minH="300px"
          position="relative"
        >
          {loans.length === 0 ? (
            <Flex h="300px" align="center" justify="center">
              <Text color="fg.muted">No se encontraron préstamos. Registra uno nuevo.</Text>
            </Flex>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Elemento</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Estado</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Fecha de Préstamo</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Fecha de Devolución</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">DNI Socio</Table.ColumnHeader>
                  <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {loans.map((loan) => (
                  <Table.Row key={loan.id} _hover={{ bg: "bg.muted/30" }}>
                    <Table.Cell fontWeight="semibold" color="fg.emphasized">
                      {loan.itemName}
                    </Table.Cell>
                    <Table.Cell>
                      <Box
                        display="inline-block"
                        px="2"
                        py="0.5"
                        borderRadius="md"
                        bg={statusColors[loan.status]?.bg}
                        color={statusColors[loan.status]?.color}
                        fontSize="xs"
                        fontWeight="bold"
                      >
                        {loan.status}
                      </Box>
                    </Table.Cell>
                    <Table.Cell color="fg.muted">
                      {new Date(loan.loanDate).toLocaleDateString("es-AR")}
                    </Table.Cell>
                    <Table.Cell color="fg.muted">
                      {new Date(loan.dueDate).toLocaleDateString("es-AR")}
                    </Table.Cell>
                    <Table.Cell color="fg.muted" fontWeight="medium">
                      {getDniByMemberId(loan.memberId)}
                    </Table.Cell>
                    <Table.Cell textAlign="end">
                      <HStack gap="2" justify="flex-end">
                        <IconButton
                          variant="ghost"
                          size="sm"
                          aria-label="Editar préstamo"
                          onClick={() => openEditModal(loan)}
                        >
                          <LuPencil />
                        </IconButton>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          colorPalette="red"
                          aria-label="Eliminar préstamo"
                          onClick={() => handleDeleteLoan(loan.id, loan.itemName)}
                        >
                          <LuTrash2 />
                        </IconButton>
                      </HStack>
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
