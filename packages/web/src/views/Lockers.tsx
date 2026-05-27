import {
  Alert,
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
  InputGroup,
  NativeSelect,
} from "@chakra-ui/react";
import { LuCheck, LuPencil, LuPlus, LuSearch, LuTrash2, LuUser, LuX } from "react-icons/lu";
import { useCallback, useEffect, useMemo, useState } from "react";
import { lockersService } from "../services/lockers";
import { membersService } from "../services/members";
import type { CreateLockerRequest, LockerDTO, MemberDTO, UpdateLockerRequest } from "@alentapp/shared";
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

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

type LockerFormData = CreateLockerRequest & {
  memberId: string;
  memberSearch: string;
  status: "" | "Maintenance";
};

export function LockersView() {
  const [lockers, setLockers] = useState<LockerDTO[]>([]);
  const [members, setMembers] = useState<MemberDTO[]>([]);
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
    memberSearch: "",
    status: "",
  });

  const resetForm = () => {
    setFormData({ number: 0, location: "", memberId: "", memberSearch: "", status: "" });
  };

  const memberById = useMemo(() => {
    return new Map(members.map((member) => [member.id, member]));
  }, [members]);

  const selectedMember = useMemo(() => {
    return formData.memberId ? memberById.get(formData.memberId) ?? null : null;
  }, [formData.memberId, memberById]);

  const filteredMembers = useMemo(() => {
    const search = formData.memberSearch.trim().toLowerCase();
    const sortedMembers = [...members].sort((first, second) => first.dni.localeCompare(second.dni));

    if (!search) {
      return sortedMembers;
    }

    return sortedMembers.filter((member) => member.dni.toLowerCase().includes(search));
  }, [formData.memberSearch, members]);

  const getMemberDisplay = (memberId: string | null) => {
    if (!memberId) {
      return "-";
    }

    const member = memberById.get(memberId);
    return member ? `${member.dni} - ${member.name}` : `Socio no encontrado (${memberId})`;
  };

  const selectMember = (member: MemberDTO) => {
    setFormData({
      ...formData,
      memberId: member.id,
      memberSearch: member.dni,
    });
  };

  const clearMember = () => {
    setFormData({
      ...formData,
      memberId: "",
      memberSearch: "",
    });
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
    const member = locker.memberId ? memberById.get(locker.memberId) : null;
    setFormData({
      number: locker.number,
      location: locker.location,
      memberId: locker.memberId ?? "",
      memberSearch: member?.dni ?? "",
      status: locker.status === "Maintenance" ? "Maintenance" : "",
    });
    setIsDialogOpen(true);
  };

  const loadLockers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await lockersService.getAll();
      setLockers(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Error al obtener los lockers"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadLockers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadLockers]);

  const loadMembers = useCallback(async () => {
    try {
      const data = await membersService.getAll();
      setMembers(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Error al obtener los socios"));
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMembers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadMembers]);

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

        if (editingLocker.status === "Maintenance" && formData.status === "") {
          data.memberId = null;
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
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Error al crear el locker"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLocker = async (locker: LockerDTO) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el locker N° ${locker.number}? Esta acción no se puede deshacer.`)) {
      return;
    }

    setError(null);
    setSuccessMessage(null);

    try {
      await lockersService.delete(locker.id);
      await loadLockers();
      setSuccessMessage("Locker eliminado correctamente.");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Error al eliminar el locker"));
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
                    <Field label="Socio asignado">
                      {selectedMember ? (
                        <Flex
                          align="center"
                          justify="space-between"
                          gap="3"
                          w="full"
                          px="3"
                          py="2.5"
                          borderWidth="1px"
                          borderColor="blue.200"
                          bg="blue.50"
                          borderRadius="md"
                        >
                          <HStack gap="3" minW="0">
                            <Flex
                              align="center"
                              justify="center"
                              boxSize="9"
                              flexShrink="0"
                              borderRadius="full"
                              bg="blue.100"
                              color="blue.700"
                            >
                              <LuUser />
                            </Flex>
                            <Stack gap="0" minW="0">
                              <Text fontWeight="semibold" color="fg.emphasized" lineHeight="short" truncate>
                                {selectedMember.name}
                              </Text>
                              <Text fontSize="sm" color="fg.muted" lineHeight="short">
                                DNI {selectedMember.dni}
                              </Text>
                            </Stack>
                          </HStack>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            colorPalette="red"
                            flexShrink="0"
                            onClick={clearMember}
                          >
                            <LuX /> Quitar
                          </Button>
                        </Flex>
                      ) : (
                        <Flex
                          align="center"
                          gap="2"
                          w="full"
                          px="3"
                          py="2.5"
                          borderWidth="1px"
                          borderStyle="dashed"
                          borderColor="border"
                          borderRadius="md"
                          color="fg.muted"
                        >
                          <LuUser />
                          <Text fontSize="sm">Sin socio asignado</Text>
                        </Flex>
                      )}
                    </Field>

                    <Field
                      label="Buscar socio por DNI"
                      helperText="Escribi el DNI y elegi un socio de la lista para asignarlo."
                    >
                      <InputGroup w="full" startElement={<LuSearch />}>
                        <Input
                          placeholder="Ej. 12345678"
                          value={formData.memberSearch}
                          onChange={(e) => setFormData({
                            ...formData,
                            memberSearch: e.target.value,
                            memberId: "",
                          })}
                        />
                      </InputGroup>
                      <Box
                        mt="2"
                        w="full"
                        borderWidth="1px"
                        borderColor="border"
                        borderRadius="md"
                        maxH="208px"
                        overflowY="auto"
                      >
                        {filteredMembers.length === 0 ? (
                          <Flex align="center" justify="center" py="6" px="4">
                            <Text fontSize="sm" color="fg.muted" textAlign="center">
                              {formData.memberSearch.trim() === ""
                                ? "No hay socios cargados."
                                : "No hay socios con ese DNI."}
                            </Text>
                          </Flex>
                        ) : (
                          <Stack
                            gap="0"
                            separator={<Box borderBottomWidth="1px" borderColor="border" />}
                          >
                            {filteredMembers.slice(0, 25).map((member) => {
                              const isSelected = formData.memberId === member.id;
                              return (
                                <Flex
                                  key={member.id}
                                  as="button"
                                  type="button"
                                  align="center"
                                  justify="space-between"
                                  gap="3"
                                  w="full"
                                  textAlign="left"
                                  px="3"
                                  py="2.5"
                                  cursor="pointer"
                                  bg={isSelected ? "blue.50" : "transparent"}
                                  transition="background 0.15s"
                                  _hover={{ bg: isSelected ? "blue.100" : "bg.muted" }}
                                  onClick={() => selectMember(member)}
                                >
                                  <Stack gap="0" minW="0">
                                    <Text
                                      fontWeight="semibold"
                                      color="fg.emphasized"
                                      lineHeight="short"
                                    >
                                      DNI {member.dni}
                                    </Text>
                                    <Text
                                      fontSize="sm"
                                      color="fg.muted"
                                      lineHeight="short"
                                      truncate
                                    >
                                      {member.name}
                                    </Text>
                                  </Stack>
                                  {isSelected && (
                                    <Box color="blue.600" flexShrink="0">
                                      <LuCheck />
                                    </Box>
                                  )}
                                </Flex>
                              );
                            })}
                          </Stack>
                        )}
                      </Box>
                    </Field>

                    <Field label="Estado">
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          id="locker-status-select"
                          aria-label="Estado"
                          value={formData.status}
                          onChange={(e) => setFormData({
                            ...formData,
                            status: e.target.value as LockerFormData["status"],
                          })}
                        >
                          <option value="">Automatico segun socio</option>
                          <option value="Maintenance">En mantenimiento</option>
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
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
          <Alert.Root status="success">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Exito</Alert.Title>
              <Alert.Description>{successMessage}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {error && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Error</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
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
                  <Table.ColumnHeader py="4">Socio</Table.ColumnHeader>
                  <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
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
                    <Table.Cell color="fg.muted">{getMemberDisplay(locker.memberId)}</Table.Cell>
                    <Table.Cell textAlign="end">
                      <HStack justify="flex-end" gap="2">
                        <IconButton
                          variant="ghost"
                          size="sm"
                          colorPalette="red"
                          aria-label="Eliminar locker"
                          onClick={() => handleDeleteLocker(locker)}
                        >
                          <LuTrash2 />
                        </IconButton>
                        <Button size="sm" variant="ghost" onClick={() => openEditModal(locker)}>
                          <LuPencil /> Editar
                        </Button>
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
