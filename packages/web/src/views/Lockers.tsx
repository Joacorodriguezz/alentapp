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
import { LuPencil, LuPlus } from "react-icons/lu";
import { useCallback, useEffect, useState } from "react";
import { lockersService } from "../services/lockers";
import type { CreateLockerRequest, LockerDTO, UpdateLockerRequest } from "@alentapp/shared";
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

const lockerStatusLabels: Record<LockerDTO["status"], string> = {
  Available: "Disponible",
  Occupied: "Ocupado",
  Maintenance: "En mantenimiento",
};

const lockerStatusStyles: Record<LockerDTO["status"], { bg: string; color: string }> = {
  Available: { bg: "green.50", color: "green.700" },
  Occupied: { bg: "orange.50", color: "orange.700" },
  Maintenance: { bg: "yellow.50", color: "yellow.700" },
};

type LockerFormData = CreateLockerRequest & {
  memberId: string;
  status: "" | "Maintenance";
};

export function LockersView() {
  const [lockers, setLockers] = useState<LockerDTO[]>([]);
  const [editingLocker, setEditingLocker] = useState<LockerDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<LockerFormData>({
    number: 0,
    location: "",
    memberId: "",
    status: "",
  });

  const resetForm = () => {
    setFormData({ number: 0, location: "", memberId: "", status: "" });
  };

  const openCreateModal = () => {
    setError(null);
    setSuccessMessage(null);
    setEditingLocker(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditModal = (locker: LockerDTO) => {
    setError(null);
    setSuccessMessage(null);
    setEditingLocker(locker);
    setFormData({
      number: locker.number,
      location: locker.location,
      memberId: locker.memberId ?? "",
      status: "",
    });
    setIsDialogOpen(true);
  };

  const loadLockers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await lockersService.getAll();
      setLockers(data);
    } catch (err: any) {
      setError(err.message || "Error al obtener los lockers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLockers();
  }, [loadLockers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!Number.isInteger(formData.number) || formData.number <= 0) {
      setError("El numero debe ser un entero positivo");
      return;
    }

    if (formData.location.trim() === "") {
      setError("La ubicacion es obligatoria");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingLocker) {
        const data: UpdateLockerRequest = {
          number: formData.number,
          location: formData.location.trim(),
        };
        const previousMemberId = editingLocker.memberId ?? "";

        if (formData.memberId.trim() !== previousMemberId) {
          data.memberId = formData.memberId.trim() === "" ? null : formData.memberId.trim();
        }

        if (formData.status === "Maintenance") {
          data.status = "Maintenance";
        }

        await lockersService.update(editingLocker.id, data);
      } else {
        const locker = await lockersService.create({
          number: formData.number,
          location: formData.location.trim(),
        });
        setLockers((current) => [locker, ...current]);
      }

      await loadLockers();
      resetForm();
      setEditingLocker(null);
      setIsDialogOpen(false);
      setSuccessMessage(editingLocker ? "Locker actualizado correctamente." : "Locker creado correctamente.");
    } catch (err: any) {
      setError(err.message || "Error al crear el locker");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Administracion de Lockers</Heading>
            <Text color="fg.muted" fontSize="md">
              Registra nuevos lockers asegurando numero unico, ubicacion y estado inicial disponible.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Agregar Locker
            </Button>
          </HStack>
        </Flex>

        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingLocker ? "Editar Locker" : "Agregar Nuevo Locker"}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field label="Numero" required>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Ej. 12"
                    value={formData.number || ""}
                    onChange={(e) => {
                      const nextNumber = Number.parseInt(e.target.value, 10);
                      setFormData({
                        ...formData,
                        number: Number.isNaN(nextNumber) ? 0 : nextNumber,
                      });
                    }}
                    required
                  />
                </Field>
                <Field label="Ubicacion" required>
                  <Input
                    placeholder="Ej. Vestuario principal"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </Field>
                {editingLocker && (
                  <>
                    <Field label="Socio ID">
                      <Input
                        placeholder="UUID del socio o vacio para liberar"
                        value={formData.memberId}
                        onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                      />
                    </Field>
                    <Field label="Estado">
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({
                          ...formData,
                          status: e.target.value as LockerFormData["status"],
                        })}
                      >
                        <option value="">Automatico segun socio</option>
                        <option value="Maintenance">Maintenance</option>
                      </select>
                    </Field>
                  </>
                )}
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                {editingLocker ? "Guardar Cambios" : "Crear Locker"}
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>

        {successMessage && (
          <Box p="4" bg="green.50" color="green.700" borderRadius="md" border="1px solid" borderColor="green.200">
            <Text fontWeight="bold">Exito:</Text>
            <Text>{successMessage}</Text>
          </Box>
        )}

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
            <Flex h="300px" align="center" justify="center">
              <Text color="fg.muted">Cargando lockers...</Text>
            </Flex>
          ) : lockers.length === 0 ? (
            <Flex h="300px" align="center" justify="center">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No hay lockers cargados.</Text>
                <Button variant="ghost" onClick={openCreateModal}>Agregar Locker</Button>
              </Stack>
            </Flex>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Numero</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Ubicacion</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Estado</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Socio ID</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Acciones</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {lockers.map((locker) => (
                  <Table.Row key={locker.id} _hover={{ bg: "bg.muted/30" }}>
                    <Table.Cell fontWeight="semibold" color="fg.emphasized">
                      {locker.number}
                    </Table.Cell>
                    <Table.Cell color="fg.muted">{locker.location}</Table.Cell>
                    <Table.Cell>
                      <Box
                        display="inline-block"
                        px="2"
                        py="0.5"
                        borderRadius="md"
                        bg={lockerStatusStyles[locker.status].bg}
                        color={lockerStatusStyles[locker.status].color}
                        fontSize="xs"
                        fontWeight="bold"
                      >
                        {lockerStatusLabels[locker.status]}
                      </Box>
                    </Table.Cell>
                    <Table.Cell color="fg.muted">{locker.memberId ?? "-"}</Table.Cell>
                    <Table.Cell>
                      <Button size="sm" variant="ghost" onClick={() => openEditModal(locker)}>
                        <LuPencil /> Editar
                      </Button>
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
