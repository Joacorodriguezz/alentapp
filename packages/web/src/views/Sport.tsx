import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  HStack,
  IconButton,
  Input,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { LuPencil, LuPlus, LuRefreshCw } from "react-icons/lu";
import { useEffect, useState } from "react";
import type { CreateSportRequest, SportFilters, SportResponse, UpdateSportRequest } from "@alentapp/shared";
import { sportsService } from "../services/sport";
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "../components/ui/dialog";
import { Field } from "../components/ui/field";
import {
  createListCollection,
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "../components/ui/select";

const medicalCertificateOptions = createListCollection({
  items: [
    { label: "No", value: "false" },
    { label: "Sí", value: "true" },
  ],
});

const filterOptions = createListCollection({
  items: [
    { label: "Todos", value: "all" },
    { label: "Requiere certificado", value: "true" },
    { label: "No requiere certificado", value: "false" },
  ],
});

type SportFormData = {
  name: string;
  description: string;
  maxCapacity: string;
  additionalPrice: string;
  requiresMedicalCertificate?: boolean;
};

const initialFormData: SportFormData = {
  name: "",
  description: "",
  maxCapacity: "",
  additionalPrice: "",
  requiresMedicalCertificate: false,
};

export function SportsView() {
  const [sports, setSports] = useState<SportResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSport, setSavedSport] = useState<SportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingSportId, setEditingSportId] = useState<string | null>(null);
  const [certificateFilter, setCertificateFilter] = useState("all");
  const [formData, setFormData] = useState<SportFormData>(initialFormData);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sportToDelete, setSportToDelete] = useState<SportResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletedSportName, setDeletedSportName] = useState<string | null>(null);

  const fetchSports = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const filters = buildFilters();
      const data = await sportsService.getAll(filters);
      setSports(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar los deportes");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingSportId(null);
    setFormData(initialFormData);
    setError(null);
    setSavedSport(null);
    setIsDialogOpen(true);
  };

  const openEditModal = (sport: SportResponse) => {
    setEditingSportId(sport.id);
    setFormData({
      name: sport.name,
      description: sport.description ?? "",
      maxCapacity: String(sport.maxCapacity),
      additionalPrice: sport.additionalPrice === null ? "" : String(sport.additionalPrice),
      requiresMedicalCertificate: sport.requiresMedicalCertificate,
    });
    setError(null);
    setSavedSport(null);
    setIsDialogOpen(true);
  };

  const openDeleteModal = (sport: SportResponse) => {
    setSportToDelete(sport);
    setDeleteError(null);
    setDeletedSportName(null);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!sportToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await sportsService.delete(sportToDelete.id);
      setDeletedSportName(sportToDelete.name);
      setIsDeleteDialogOpen(false);
      setSportToDelete(null);
      fetchSports();
    } catch (err: any) {
      setDeleteError(err.message || "Error al eliminar el deporte");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const sport = editingSportId !== null
        ? await sportsService.update(editingSportId, buildUpdatePayload())
        : await sportsService.create(buildCreatePayload());

      setSavedSport(sport);
      setIsDialogOpen(false);
      setFormData(initialFormData);
      setEditingSportId(null);
      fetchSports();
    } catch (err: any) {
      setError(err.message || "Error al guardar el deporte");
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildCreatePayload = (): CreateSportRequest => ({
    name: formData.name,
    description: formData.description || undefined,
    maxCapacity: Number(formData.maxCapacity),
    additionalPrice: formData.additionalPrice
      ? Number(formData.additionalPrice)
      : undefined,
    requiresMedicalCertificate: formData.requiresMedicalCertificate ?? false,
  });

  const buildUpdatePayload = (): UpdateSportRequest => ({
    description: formData.description || undefined,
    maxCapacity: formData.maxCapacity ? Number(formData.maxCapacity) : undefined,
    additionalPrice: formData.additionalPrice
      ? Number(formData.additionalPrice)
      : undefined,
    requiresMedicalCertificate: formData.requiresMedicalCertificate,
  });

  const buildFilters = (): SportFilters => {
    if (certificateFilter === "true") {
      return { requiresMedicalCertificate: true };
    }

    if (certificateFilter === "false") {
      return { requiresMedicalCertificate: false };
    }

    return {};
  };

  useEffect(() => {
    fetchSports();
  }, [certificateFilter]);

  return (
    <>
      {/* Modal de confirmación de eliminación */}
      <DialogRoot open={isDeleteDialogOpen} onOpenChange={(e) => setIsDeleteDialogOpen(e.open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Deporte</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text>
              ¿Estás seguro que querés eliminar el deporte{" "}
              <Text as="span" fontWeight="bold">{sportToDelete?.name}</Text>?
              Esta acción no se puede deshacer.
            </Text>
            {deleteError && (
              <Box mt="3" p="3" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
                <Text>{deleteError}</Text>
              </Box>
            )}
          </DialogBody>
          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogActionTrigger>
            <Button colorPalette="red" loading={isDeleting} onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>

      {/* Modal de crear/editar */}
      <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
        <Stack gap="8">
          <Flex justify="space-between" align="center">
            <Stack gap="1">
              <Heading size="2xl" fontWeight="bold">Administración de Deportes</Heading>
              <Text color="fg.muted" fontSize="md">
                Gestiona las actividades deportivas disponibles en Alentapp.
              </Text>
            </Stack>
            <HStack gap="3">
              <Button variant="outline" onClick={fetchSports} disabled={isLoading}>
                <LuRefreshCw /> Actualizar
              </Button>
              <Button colorPalette="blue" size="md" onClick={openCreateModal}>
                <LuPlus /> Agregar Deporte
              </Button>
            </HStack>
          </Flex>

          <Box maxW="sm">
            <Field label="Filtro por certificado médico">
              <SelectRoot
                collection={filterOptions}
                value={[certificateFilter]}
                onValueChange={(e) => setCertificateFilter(e.value[0])}
              >
                <SelectTrigger>
                  <SelectValueText placeholder="Seleccione un filtro" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.items.map((option) => (
                    <SelectItem item={option} key={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </Field>
          </Box>

          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingSportId !== null ? "Editar Deporte" : "Agregar Nuevo Deporte"}</DialogTitle>
              </DialogHeader>
              <DialogBody>
                <Stack gap="4">
                  {editingSportId !== null ? (
                    <Field label="ID del Deporte" required>
                      <Input
                        placeholder="UUID del deporte"
                        value={editingSportId}
                        readOnly
                        required
                      />
                    </Field>
                  ) : (
                    <Field label="Nombre" required>
                      <Input
                        placeholder="Ej. Natación"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </Field>
                  )}
                  <Field label="Descripción">
                    <Input
                      placeholder="Ej. Clases para todos los niveles"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={fetchSports} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Agregar Deporte
            </Button>
          </HStack>
        </Flex>

        <Box maxW="sm">
          <Field label="Filtro por certificado médico">
            <SelectRoot
              collection={filterOptions}
              value={[certificateFilter]}
              onValueChange={(e) => setCertificateFilter(e.value[0])}
            >
              <SelectTrigger>
                <SelectValueText placeholder="Seleccione un filtro" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.items.map((option) => (
                  <SelectItem item={option} key={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          </Field>
        </Box>

        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingSportId !== null ? "Editar Deporte" : "Agregar Nuevo Deporte"}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                {editingSportId !== null ? (
                  <Field label="ID del Deporte" required>
                    <Input
                      placeholder="UUID del deporte"
                      value={editingSportId}
                      readOnly
                      required
                    />
                  </Field>
                  <Field label="Capacidad Máxima" required={editingSportId === null}>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Ej. 30"
                      value={formData.maxCapacity}
                      onChange={(e) => setFormData({ ...formData, maxCapacity: e.target.value })}
                      required={editingSportId === null}
                    />
                  </Field>
                  <Field label="Precio Adicional">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Ej. 1500"
                      value={formData.additionalPrice}
                      onChange={(e) => setFormData({ ...formData, additionalPrice: e.target.value })}
                    />
                  </Field>
                  <Field label="Requiere Certificado Médico" required={editingSportId === null}>
                    <SelectRoot
                      collection={medicalCertificateOptions}
                      value={formData.requiresMedicalCertificate === undefined ? [] : [String(formData.requiresMedicalCertificate)]}
                      onValueChange={(e) =>
                        setFormData({
                          ...formData,
                          requiresMedicalCertificate: e.value[0] === "true",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValueText placeholder="Seleccione una opción" />
                      </SelectTrigger>
                      <SelectContent>
                        {medicalCertificateOptions.items.map((option) => (
                          <SelectItem item={option} key={option.value}>
                            {option.label}
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
                  {editingSportId !== null ? "Guardar Cambios" : "Crear Deporte"}
                </Button>
              </DialogFooter>
              <DialogCloseTrigger />
            </form>
          </DialogContent>

          {error && (
            <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
              <Text fontWeight="bold">Error:</Text>
              <Text>{error}</Text>
            </Box>
          )}

          {savedSport && (
            <Box p="4" bg="green.50" color="green.700" borderRadius="md" border="1px solid" borderColor="green.200">
              <Text fontWeight="bold">Deporte guardado correctamente:</Text>
              <Text>{savedSport.name}</Text>
            </Box>
          )}

          {deletedSportName && (
            <Box p="4" bg="green.50" color="green.700" borderRadius="md" border="1px solid" borderColor="green.200">
              <Text fontWeight="bold">Deporte eliminado correctamente:</Text>
              <Text>{deletedSportName}</Text>
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
                  <Text color="fg.muted">Cargando deportes...</Text>
                </Stack>
              </Center>
            ) : sports.length === 0 ? (
              <Center h="300px">
                <Stack align="center" gap="4">
                  <Text color="fg.muted">No se encontraron deportes.</Text>
                  <Button variant="ghost" onClick={fetchSports}>Reintentar</Button>
                </Stack>
              </Center>
            ) : (
              <Table.Root size="md" variant="line" interactive>
                <Table.Header>
                  <Table.Row bg="bg.muted/50">
                    <Table.ColumnHeader py="4">Nombre</Table.ColumnHeader>
                    <Table.ColumnHeader py="4">Descripción</Table.ColumnHeader>
                    <Table.ColumnHeader py="4">Capacidad</Table.ColumnHeader>
                    <Table.ColumnHeader py="4">Precio Adicional</Table.ColumnHeader>
                    <Table.ColumnHeader py="4">Certificado Médico</Table.ColumnHeader>
                    <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {sports.map((sport) => (
                    <Table.Row key={sport.id} _hover={{ bg: "bg.muted/30" }}>
                      <Table.Cell fontWeight="semibold" color="fg.emphasized">
                        {sport.name}
                      </Table.Cell>
                      <Table.Cell color="fg.muted">{sport.description ?? "-"}</Table.Cell>
                      <Table.Cell color="fg.muted">{sport.maxCapacity}</Table.Cell>
                      <Table.Cell color="fg.muted">
                        {sport.additionalPrice === null ? "-" : `$${sport.additionalPrice}`}
                      </Table.Cell>
                      <Table.Cell>
                        <Box
                          display="inline-block"
                          px="2"
                          py="0.5"
                          borderRadius="md"
                          bg={sport.requiresMedicalCertificate ? "orange.50" : "green.50"}
                          color={sport.requiresMedicalCertificate ? "orange.700" : "green.700"}
                          fontSize="xs"
                          fontWeight="bold"
                        >
                          {sport.requiresMedicalCertificate ? "Requiere" : "No requiere"}
                        </Box>
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        <HStack justify="end" gap="1">
                          <IconButton
                            variant="ghost"
                            size="sm"
                            aria-label="Editar deporte"
                            onClick={() => openEditModal(sport)}
                          >
                            <LuPencil />
                          </IconButton>
                          <IconButton
                            variant="ghost"
                            size="sm"
                            aria-label="Eliminar deporte"
                            color="red.500"
                            onClick={() => openDeleteModal(sport)}
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
    </>
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
                <Text color="fg.muted">Cargando deportes...</Text>
              </Stack>
            </Center>
          ) : sports.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No se encontraron deportes.</Text>
                <Button variant="ghost" onClick={fetchSports}>Reintentar</Button>
              </Stack>
            </Center>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Nombre</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Descripción</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Capacidad</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Precio Adicional</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Certificado Médico</Table.ColumnHeader>
                  <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {sports.map((sport) => (
                  <Table.Row key={sport.id} _hover={{ bg: "bg.muted/30" }}>
                    <Table.Cell fontWeight="semibold" color="fg.emphasized">
                      {sport.name}
                    </Table.Cell>
                    <Table.Cell color="fg.muted">{sport.description ?? "-"}</Table.Cell>
                    <Table.Cell color="fg.muted">{sport.maxCapacity}</Table.Cell>
                    <Table.Cell color="fg.muted">
                      {sport.additionalPrice === null ? "-" : `$${sport.additionalPrice}`}
                    </Table.Cell>
                    <Table.Cell>
                      <Box
                        display="inline-block"
                        px="2"
                        py="0.5"
                        borderRadius="md"
                        bg={sport.requiresMedicalCertificate ? "orange.50" : "green.50"}
                        color={sport.requiresMedicalCertificate ? "orange.700" : "green.700"}
                        fontSize="xs"
                        fontWeight="bold"
                      >
                        {sport.requiresMedicalCertificate ? "Requiere" : "No requiere"}
                      </Box>
                    </Table.Cell>
                    <Table.Cell textAlign="end">
                      <IconButton
                        variant="ghost"
                        size="sm"
                        aria-label="Editar deporte"
                        onClick={() => openEditModal(sport)}
                      >
                        <LuPencil />
                      </IconButton>
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