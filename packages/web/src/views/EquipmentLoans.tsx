import {
  Table,
  Button,
  Heading,
  HStack,
  Stack,
  Text,
  Box,
  Flex,
  Input,
} from "@chakra-ui/react";
import { LuPlus } from "react-icons/lu";
import { useState } from "react";
import { equipmentLoansService } from "../services/equipmentLoans";
import type { CreateEquipmentLoanRequest, EquipmentLoanResponse } from "@alentapp/shared";
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

const statusColors: Record<string, { bg: string; color: string }> = {
  Loaned:   { bg: "blue.50",   color: "blue.700" },
  Returned: { bg: "green.50",  color: "green.700" },
  Damaged:  { bg: "red.50",    color: "red.700" },
};

export function EquipmentLoansView() {
  const [loans, setLoans] = useState<EquipmentLoanResponse[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateEquipmentLoanRequest>({
    itemName: "",
    dueDate: "",
    memberId: "",
  });

  const openCreateModal = () => {
    setFormData({ itemName: "", dueDate: "", memberId: "" });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await equipmentLoansService.create(formData);
      setLoans([created, ...loans]);
      setIsDialogOpen(false);
    } catch (err: any) {
      alert(err.message || "Error al registrar el préstamo");
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Registrar Préstamo
            </Button>
          </HStack>
        </Flex>

        {/* Modal para registrar préstamo */}
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Préstamo</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field label="Nombre del Elemento" required>
                  <Input
                    placeholder="Ej. Pelota de Básquet Spalding"
                    value={formData.itemName}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Fecha de Devolución" required>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
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
                Registrar Préstamo
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
                  <Table.ColumnHeader py="4">Socio ID</Table.ColumnHeader>
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
                    <Table.Cell color="fg.muted" fontSize="xs">
                      {loan.memberId}
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
