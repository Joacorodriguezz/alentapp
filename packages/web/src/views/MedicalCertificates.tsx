import {
  Table,
  Button,
  Heading,
  Stack,
  Text,
  Box,
  Flex,
  Input,
  Spinner,
  Center,
  HStack,
  Checkbox,
  IconButton,
  Alert,
} from "@chakra-ui/react";
import { LuPlus, LuSearch, LuPencil, LuBan } from "react-icons/lu";
import { useEffect, useMemo, useRef, useState } from "react";
import { medicalCertificatesService } from "../services/medicalCertificates";
import { membersService } from "../services/members";
import type { MedicalCertificate, MemberDTO } from "@alentapp/shared";
import { Field } from "../components/ui/field";
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
import { Tooltip } from "../components/ui/tooltip";

export function MedicalCertificatesView() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    issueDate: "",
    expiryDate: "",
    doctorLicence: "",
    institution: "",
    dni: "",
  });

  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [searchDni, setSearchDni] = useState("");
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [soloVigente, setSoloVigente] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<MedicalCertificate[] | null>(null);

  const [editingCert, setEditingCert] = useState<MedicalCertificate | null>(null);
  const [editFormData, setEditFormData] = useState({
    issueDate: "",
    expiryDate: "",
    doctorLicence: "",
    institution: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    membersService
      .getAll()
      .then(setMembers)
      .catch(() => {
        // Si falla la carga de socios, el buscador sigue funcionando como input de texto.
      });
  }, []);

  // Cierra el dropdown de sugerencias al hacer click fuera del buscador.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSuggestOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Socios filtrados por DNI o nombre para las sugerencias del buscador.
  const suggestedMembers = useMemo(() => {
    const q = searchDni.trim().toLowerCase();
    const list = !q
      ? members
      : members.filter(
          (m) => m.dni.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
        );
    return list.slice(0, 50);
  }, [members, searchDni]);

  const handleSelectMember = (member: MemberDTO) => {
    setSearchDni(member.dni);
    setIsSuggestOpen(false);
  };

  const openCreateModal = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setFormData({
      issueDate: "",
      expiryDate: "",
      doctorLicence: "",
      institution: "",
      dni: "",
    });
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await medicalCertificatesService.create(formData);
      setSuccessMessage("¡Certificado médico registrado con éxito! El estado del certificado es Validado por defecto y se han invalidado los registros anteriores de este socio.");
      setFormData({
        issueDate: "",
        expiryDate: "",
        doctorLicence: "",
        institution: "",
        dni: "",
      });
      setIsCreateOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al registrar el certificado médico");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setSearchError(null);
    setCertificates(null);
    try {
      const data = await medicalCertificatesService.getByMember(searchDni, soloVigente);
      setCertificates(data);
    } catch (err: any) {
      setSearchError(err.message || "Error al buscar los certificados");
    } finally {
      setIsSearching(false);
    }
  };

  const handleEditClick = (cert: MedicalCertificate) => {
    setEditingCert(cert);
    setEditFormData({
      issueDate: cert.issueDate.split("T")[0],
      expiryDate: cert.expiryDate.split("T")[0],
      doctorLicence: cert.doctorLicence,
      institution: cert.institution,
    });
    setEditSuccess(null);
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCert) return;
    setIsEditing(true);
    setEditSuccess(null);
    setEditError(null);
    try {
      const updated = await medicalCertificatesService.update(editingCert.id, editFormData);
      setEditSuccess("¡Certificado actualizado con éxito!");
      setCertificates((prev) =>
        prev ? prev.map((c) => (c.id === updated.id ? updated : c)) : prev
      );
      setEditingCert(null);
    } catch (err: any) {
      setEditError(err.message || "Error al actualizar el certificado médico");
    } finally {
      setIsEditing(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await medicalCertificatesService.logicalDelete(id);
      setCertificates((prev) =>
        prev ? prev.map((c) => (c.id === id ? { ...c, isValidated: false } : c)) : prev
      );
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err.message || "Error al anular el certificado médico");
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Stack gap="8" maxW="4xl" mx="auto">
      <Flex justify="space-between" align="flex-start" gap="4">
        <Stack gap="1">
          <Heading size="2xl" fontWeight="bold">Certificados Médicos</Heading>
          <Text color="fg.muted" fontSize="md">
            Digitaliza la gestión de aptos físicos de los socios para garantizar el cumplimiento de normativas de salud.
          </Text>
        </Stack>
        <Button colorPalette="blue" flexShrink={0} onClick={openCreateModal}>
          <LuPlus /> Registrar Certificado
        </Button>
      </Flex>

      {/* Feedback de operaciones */}
      {successMessage && (
        <Alert.Root status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Éxito</Alert.Title>
            <Alert.Description>{successMessage}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {editSuccess && (
        <Alert.Root status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Éxito</Alert.Title>
            <Alert.Description>{editSuccess}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {/* Modal de registro */}
      <DialogRoot
        open={isCreateOpen}
        onOpenChange={(e) => {
          setIsCreateOpen(e.open);
          if (!e.open) setErrorMessage(null);
        }}
      >
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Registrar Certificado Médico</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field label="DNI del Socio" required>
                  <Input
                    placeholder="Ej. 12345678"
                    value={formData.dni}
                    onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                    required
                  />
                </Field>

                <Field label="Fecha de Emisión" required>
                  <Input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    required
                  />
                </Field>

                <Field label="Fecha de Vencimiento" required>
                  <Input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    required
                  />
                </Field>

                <Field label="Matrícula del Profesional" required>
                  <Input
                    placeholder="Ej. MP 12345"
                    value={formData.doctorLicence}
                    onChange={(e) => setFormData({ ...formData, doctorLicence: e.target.value })}
                    required
                  />
                </Field>

                <Field label="Entidad Emisora / Institución" required>
                  <Input
                    placeholder="Ej. Hospital San Martín"
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    required
                  />
                </Field>

                {errorMessage && (
                  <Alert.Root status="error">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>Error</Alert.Title>
                      <Alert.Description>{errorMessage}</Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                )}
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                <LuPlus /> Registrar Certificado
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>
      </DialogRoot>

      {/* Modal de edición */}
      <DialogRoot
        open={!!editingCert}
        onOpenChange={(e) => {
          if (!e.open) {
            setEditingCert(null);
            setEditError(null);
          }
        }}
      >
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Editar Certificado Médico</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field label="Fecha de Emisión" required>
                  <Input
                    type="date"
                    value={editFormData.issueDate}
                    onChange={(e) => setEditFormData({ ...editFormData, issueDate: e.target.value })}
                    required
                  />
                </Field>

                <Field label="Fecha de Vencimiento">
                  <Input
                    type="date"
                    value={editFormData.expiryDate}
                    onChange={(e) => setEditFormData({ ...editFormData, expiryDate: e.target.value })}
                  />
                </Field>

                <Field label="Matrícula del Profesional">
                  <Input
                    placeholder="Ej. MP 12345"
                    value={editFormData.doctorLicence}
                    onChange={(e) => setEditFormData({ ...editFormData, doctorLicence: e.target.value })}
                  />
                </Field>

                <Field label="Entidad Emisora / Institución">
                  <Input
                    placeholder="Ej. Hospital San Martín"
                    value={editFormData.institution}
                    onChange={(e) => setEditFormData({ ...editFormData, institution: e.target.value })}
                  />
                </Field>

                {editError && (
                  <Alert.Root status="error">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>Error</Alert.Title>
                      <Alert.Description>{editError}</Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                )}
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isEditing}>
                <LuPencil /> Guardar Cambios
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>
      </DialogRoot>

      {/* Modal de confirmación de anulación */}
      <DialogRoot
        role="alertdialog"
        open={!!deleteTarget}
        onOpenChange={(e) => {
          if (!e.open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular Certificado</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text>¿Confirma la anulación del certificado? Esta acción no se puede revertir.</Text>
          </DialogBody>
          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogActionTrigger>
            <Button colorPalette="red" loading={isDeleting} onClick={confirmDelete}>
              <LuBan /> Anular
            </Button>
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>

      {/* Consulta de historial */}
      <Box
        bg="bg.panel"
        p="6"
        borderRadius="xl"
        boxShadow="sm"
        borderWidth="1px"
      >
        <Heading size="md" fontWeight="semibold" mb="4">Historial de Certificados por Socio</Heading>
        <form onSubmit={handleSearch}>
          <HStack gap="3" mb="3" align="flex-start">
            <Box ref={searchRef} position="relative" flex="1">
              <Box position="relative">
                <Box
                  position="absolute"
                  left="3"
                  top="50%"
                  transform="translateY(-50%)"
                  color="fg.muted"
                  pointerEvents="none"
                >
                  <LuSearch />
                </Box>
                <Input
                  placeholder="Ingrese el DNI del socio"
                  value={searchDni}
                  onChange={(e) => {
                    setSearchDni(e.target.value);
                    setIsSuggestOpen(true);
                  }}
                  onFocus={() => setIsSuggestOpen(true)}
                  pl="9"
                  required
                  autoComplete="off"
                />
              </Box>

              {isSuggestOpen && members.length > 0 && (
                <Box
                  position="absolute"
                  top="calc(100% + 4px)"
                  left={0}
                  right={0}
                  zIndex={20}
                  bg="bg.panel"
                  borderWidth="1px"
                  borderColor="border.muted"
                  borderRadius="md"
                  boxShadow="md"
                  maxH="240px"
                  overflowY="auto"
                >
                  {suggestedMembers.length === 0 ? (
                    <Box px="3" py="2">
                      <Text fontSize="sm" color="fg.muted">
                        No se encontraron socios
                      </Text>
                    </Box>
                  ) : (
                    suggestedMembers.map((member) => (
                      <Box
                        key={member.id}
                        px="3"
                        py="2"
                        cursor="pointer"
                        bg={member.dni === searchDni ? "bg.muted" : undefined}
                        _hover={{ bg: "bg.muted/60" }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectMember(member)}
                      >
                        <Text fontSize="sm" fontWeight="medium">
                          {member.name}
                        </Text>
                        <Text fontSize="xs" color="fg.muted">
                          DNI {member.dni}
                        </Text>
                      </Box>
                    ))
                  )}
                </Box>
              )}
            </Box>
            <Button type="submit" colorPalette="blue" loading={isSearching} flexShrink={0}>
              <LuSearch /> Buscar
            </Button>
          </HStack>
          <Checkbox.Root
            checked={soloVigente}
            onCheckedChange={(e) => setSoloVigente(!!e.checked)}
            mb="4"
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label fontSize="sm" color="fg.muted">Mostrar solo certificado vigente</Checkbox.Label>
          </Checkbox.Root>
        </form>

        {searchError && (
          <Box mb="4">
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Error</Alert.Title>
                <Alert.Description>{searchError}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          </Box>
        )}

        {deleteError && (
          <Box mb="4">
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Error al anular</Alert.Title>
                <Alert.Description>{deleteError}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          </Box>
        )}

        {isSearching && (
          <Center h="150px">
            <Stack align="center" gap="4">
              <Spinner size="xl" color="blue.500" />
              <Text color="fg.muted">Buscando certificados...</Text>
            </Stack>
          </Center>
        )}

        {!isSearching && certificates !== null && (
          certificates.length === 0 ? (
            <Center h="100px">
              <Text color="fg.muted">No se encontraron certificados para este socio.</Text>
            </Center>
          ) : (
            <Box borderRadius="lg" borderWidth="1px" overflow="hidden">
              <Table.Root size="md" variant="line" interactive>
                <Table.Header>
                  <Table.Row bg="bg.muted/50">
                    <Table.ColumnHeader py="4">Emisión</Table.ColumnHeader>
                    <Table.ColumnHeader py="4">Vencimiento</Table.ColumnHeader>
                    <Table.ColumnHeader py="4">Institución</Table.ColumnHeader>
                    <Table.ColumnHeader py="4">Matrícula</Table.ColumnHeader>
                    <Table.ColumnHeader py="4">Estado</Table.ColumnHeader>
                    <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {certificates.map((cert) => (
                    <Table.Row key={cert.id} _hover={{ bg: "bg.muted/30" }}>
                      <Table.Cell fontWeight="semibold" color="fg.emphasized">{cert.issueDate ? cert.issueDate.split("T")[0].split("-").reverse().join("/") : ""}</Table.Cell>
                      <Table.Cell color="fg.muted">{cert.expiryDate ? cert.expiryDate.split("T")[0].split("-").reverse().join("/") : ""}</Table.Cell>
                      <Table.Cell color="fg.muted">{cert.institution}</Table.Cell>
                      <Table.Cell color="fg.muted">{cert.doctorLicence}</Table.Cell>
                      <Table.Cell>
                        <Box
                          display="inline-block"
                          px="2"
                          py="0.5"
                          borderRadius="md"
                          bg={cert.isValidated ? "green.50" : "red.50"}
                          color={cert.isValidated ? "green.700" : "red.700"}
                          fontSize="xs"
                          fontWeight="bold"
                        >
                          {cert.isValidated ? "Vigente" : "Vencido"}
                        </Box>
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        <HStack gap="2" justify="flex-end">
                          <Tooltip content="Editar certificado">
                            <IconButton
                              size="sm"
                              variant="ghost"
                              aria-label="Editar certificado"
                              onClick={() => handleEditClick(cert)}
                            >
                              <LuPencil />
                            </IconButton>
                          </Tooltip>
                          {cert.isValidated && (
                            <Tooltip content="Anular certificado">
                              <IconButton
                                size="sm"
                                variant="ghost"
                                colorPalette="red"
                                aria-label="Anular certificado"
                                onClick={() => setDeleteTarget(cert.id)}
                              >
                                <LuBan />
                              </IconButton>
                            </Tooltip>
                          )}
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          )
        )}
      </Box>
    </Stack>
  );
}
