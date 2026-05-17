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
  Spinner,
  Center,
  Input,
} from "@chakra-ui/react";
import { LuPlus, LuPencil, LuTrash2, LuRefreshCw } from "react-icons/lu";
import { useEffect, useState, useMemo } from "react";
import { disciplinesService } from "../services/disciplines";
import { membersService } from "../services/members";
import type {
  DisciplineResponse,
  CreateDisciplineRequest,
  MemberDTO,
} from "@alentapp/shared";
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

const suspensionOptions = createListCollection({
  items: [
    { label: "No", value: "false" },
    { label: "Sí", value: "true" },
  ],
});

export function DisciplinesView() {
  const [disciplines, setDisciplines] = useState<DisciplineResponse[]>([]);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDisciplineId, setEditingDisciplineId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateDisciplineRequest>({
    reason: "",
    startDate: "",
    endDate: "",
    isTotalSuspension: false,
    memberId: "",
  });

  const memberOptions = useMemo(
    () =>
      createListCollection({
        items: members.map((m) => ({
          label: `${m.name} (${m.dni})`,
          value: m.id,
        })),
      }),
    [members],
  );

  const getMemberName = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    return member ? member.name : memberId;
  };

  const fetchDisciplines = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await disciplinesService.getAll();
      setDisciplines(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al cargar las disciplinas";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const data = await membersService.getAll();
      setMembers(data);
    } catch {
      // El listado de disciplinas puede mostrarse aunque falle la carga de miembros
    }
  };

  const openCreateModal = () => {
    setEditingDisciplineId(null);
    setFormData({
      reason: "",
      startDate: "",
      endDate: "",
      isTotalSuspension: false,
      memberId: members[0]?.id ?? "",
    });
    setIsDialogOpen(true);
  };

  const openEditModal = (discipline: DisciplineResponse) => {
    setEditingDisciplineId(discipline.id);
    setFormData({
      reason: discipline.reason,
      startDate: discipline.startDate,
      endDate: discipline.endDate,
      isTotalSuspension: discipline.isTotalSuspension,
      memberId: discipline.memberId,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingDisciplineId) {
        await disciplinesService.update(editingDisciplineId, formData);
      } else {
        await disciplinesService.create(formData);
      }
      setIsDialogOpen(false);
      fetchDisciplines();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al guardar la disciplina";
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDiscipline = async (id: string, reason: string) => {
    if (
      window.confirm(
        `¿Estás seguro de que deseas eliminar la disciplina "${reason}"? Esta acción no se puede deshacer.`,
      )
    ) {
      try {
        await disciplinesService.delete(id);
        fetchDisciplines();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error al eliminar la disciplina";
        alert(message);
      }
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchDisciplines();
  }, []);

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">
              Administración de Disciplinas
            </Heading>
            <Text color="fg.muted" fontSize="md">
              Gestiona las sanciones y suspensiones aplicadas a los miembros.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={fetchDisciplines} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Agregar Disciplina
            </Button>
          </HStack>
        </Flex>

        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingDisciplineId ? "Editar Disciplina" : "Agregar Nueva Disciplina"}
              </DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field label="Motivo" required>
                  <Input
                    placeholder="Ej. Falta grave en partido"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Fecha de Inicio" required>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Fecha de Fin" required>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Suspensión Total" required>
                  <SelectRoot
                    collection={suspensionOptions}
                    value={[String(formData.isTotalSuspension)]}
                    onValueChange={(e) =>
                      setFormData({
                        ...formData,
                        isTotalSuspension: e.value[0] === "true",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValueText placeholder="Seleccione una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      {suspensionOptions.items.map((opt) => (
                        <SelectItem item={opt} key={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                </Field>
                <Field label="Miembro" required>
                  <SelectRoot
                    collection={memberOptions}
                    value={formData.memberId ? [formData.memberId] : []}
                    onValueChange={(e) =>
                      setFormData({ ...formData, memberId: e.value[0] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValueText placeholder="Seleccione un miembro" />
                    </SelectTrigger>
                    <SelectContent>
                      {memberOptions.items.map((member) => (
                        <SelectItem item={member} key={member.value}>
                          {member.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                </Field>
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                {editingDisciplineId ? "Guardar Cambios" : "Crear Disciplina"}
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>

        {error && (
          <Box
            p="4"
            bg="red.50"
            color="red.700"
            borderRadius="md"
            border="1px solid"
            borderColor="red.200"
          >
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
                <Text color="fg.muted">Cargando disciplinas...</Text>
              </Stack>
            </Center>
          ) : disciplines.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No se encontraron disciplinas.</Text>
                <Button variant="ghost" onClick={fetchDisciplines}>
                  Reintentar
                </Button>
              </Stack>
            </Center>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Motivo</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Inicio</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Fin</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Suspensión Total</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Miembro</Table.ColumnHeader>
                  <Table.ColumnHeader py="4" textAlign="end">
                    Acciones
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {disciplines.map((discipline) => (
                  <Table.Row key={discipline.id} _hover={{ bg: "bg.muted/30" }}>
                    <Table.Cell fontWeight="semibold" color="fg.emphasized">
                      {discipline.reason}
                    </Table.Cell>
                    <Table.Cell color="fg.muted">{discipline.startDate}</Table.Cell>
                    <Table.Cell color="fg.muted">{discipline.endDate}</Table.Cell>
                    <Table.Cell>
                      <Box
                        display="inline-block"
                        px="2"
                        py="0.5"
                        borderRadius="md"
                        bg={discipline.isTotalSuspension ? "orange.50" : "green.50"}
                        color={discipline.isTotalSuspension ? "orange.700" : "green.700"}
                        fontSize="xs"
                        fontWeight="bold"
                      >
                        {discipline.isTotalSuspension ? "Sí" : "No"}
                      </Box>
                    </Table.Cell>
                    <Table.Cell color="fg.muted">
                      {getMemberName(discipline.memberId)}
                    </Table.Cell>
                    <Table.Cell textAlign="end">
                      <HStack gap="2" justify="flex-end">
                        <IconButton
                          variant="ghost"
                          size="sm"
                          aria-label="Editar disciplina"
                          onClick={() => openEditModal(discipline)}
                        >
                          <LuPencil />
                        </IconButton>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          colorPalette="red"
                          aria-label="Eliminar disciplina"
                          onClick={() =>
                            handleDeleteDiscipline(discipline.id, discipline.reason)
                          }
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
