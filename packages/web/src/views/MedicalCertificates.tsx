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
} from "@chakra-ui/react";
import { LuPlus, LuSearch, LuPencil, LuBan } from "react-icons/lu";
import { useState } from "react";
import { medicalCertificatesService } from "../services/medicalCertificates";
import type { MedicalCertificate } from "@alentapp/shared";
import { Field } from "../components/ui/field";

export function MedicalCertificatesView() {
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

  const [searchDni, setSearchDni] = useState("");
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
    setEditingCert(null);
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
    } catch (err: any) {
      setEditError(err.message || "Error al actualizar el certificado médico");
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Confirma la anulación del certificado? Esta acción no se puede revertir.")) return;
    setDeleteError(null);
    try {
      await medicalCertificatesService.logicalDelete(id);
      setCertificates((prev) =>
        prev ? prev.map((c) => (c.id === id ? { ...c, isValidated: false } : c)) : prev
      );
    } catch (err: any) {
      setDeleteError(err.message || "Error al anular el certificado médico");
    }
  };

  return (
    <Stack gap="8" maxW="4xl" mx="auto">
      <Stack gap="1">
        <Heading size="2xl" fontWeight="bold">Certificados Médicos</Heading>
        <Text color="fg.muted" fontSize="md">
          Digitaliza la gestión de aptos físicos de los socios para garantizar el cumplimiento de normativas de salud.
        </Text>
      </Stack>

      {/* Formulario de registro */}
      <Box
        bg="bg.panel"
        p="6"
        borderRadius="xl"
        boxShadow="sm"
        borderWidth="1px"
      >
        <Heading size="md" fontWeight="semibold" mb="4">Registrar Certificado Médico</Heading>
        <form onSubmit={handleSubmit}>
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

            {successMessage && (
              <Box p="4" bg="green.50" color="green.700" borderRadius="md" border="1px solid" borderColor="green.200">
                <Text fontWeight="bold">Éxito:</Text>
                <Text>{successMessage}</Text>
              </Box>
            )}

            {errorMessage && (
              <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
                <Text fontWeight="bold">Error:</Text>
                <Text>{errorMessage}</Text>
              </Box>
            )}

            <Flex justify="flex-end" mt="4">
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                <LuPlus /> Registrar Certificado
              </Button>
            </Flex>
          </Stack>
        </form>
      </Box>

      {/* Formulario de edición */}
      {editingCert && (
        <Box
          bg="bg.panel"
          p="6"
          borderRadius="xl"
          boxShadow="sm"
          borderWidth="1px"
        >
          <Heading size="md" fontWeight="semibold" mb="4">Editar Certificado Médico</Heading>
          <form onSubmit={handleEditSubmit}>
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

              {editSuccess && (
                <Box p="4" bg="green.50" color="green.700" borderRadius="md" border="1px solid" borderColor="green.200">
                  <Text fontWeight="bold">Éxito:</Text>
                  <Text>{editSuccess}</Text>
                </Box>
              )}

              {editError && (
                <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
                  <Text fontWeight="bold">Error:</Text>
                  <Text>{editError}</Text>
                </Box>
              )}

              <Flex justify="flex-end" gap="3" mt="4">
                <Button variant="outline" onClick={() => setEditingCert(null)}>
                  Cancelar
                </Button>
                <Button type="submit" colorPalette="blue" loading={isEditing}>
                  <LuPencil /> Guardar Cambios
                </Button>
              </Flex>
            </Stack>
          </form>
        </Box>
      )}

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
          <HStack gap="3" mb="3">
            <Input
              placeholder="Ingrese el DNI del socio"
              value={searchDni}
              onChange={(e) => setSearchDni(e.target.value)}
              required
            />
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
          <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200" mb="4">
            <Text fontWeight="bold">Error:</Text>
            <Text>{searchError}</Text>
          </Box>
        )}

        {deleteError && (
          <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200" mb="4">
            <Text fontWeight="bold">Error al anular:</Text>
            <Text>{deleteError}</Text>
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
              <Table.Root size="md" variant="line">
                <Table.Header>
                  <Table.Row bg="bg.muted/50">
                    <Table.ColumnHeader py="3">Emisión</Table.ColumnHeader>
                    <Table.ColumnHeader py="3">Vencimiento</Table.ColumnHeader>
                    <Table.ColumnHeader py="3">Institución</Table.ColumnHeader>
                    <Table.ColumnHeader py="3">Matrícula</Table.ColumnHeader>
                    <Table.ColumnHeader py="3">Estado</Table.ColumnHeader>
                    <Table.ColumnHeader py="3">Acciones</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {certificates.map((cert) => (
                    <Table.Row key={cert.id} _hover={{ bg: "bg.muted/30" }}>
                      <Table.Cell>{new Date(cert.issueDate).toLocaleDateString("es-AR")}</Table.Cell>
                      <Table.Cell>{new Date(cert.expiryDate).toLocaleDateString("es-AR")}</Table.Cell>
                      <Table.Cell>{cert.institution}</Table.Cell>
                      <Table.Cell>{cert.doctorLicence}</Table.Cell>
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
                      <Table.Cell>
                        <HStack gap="2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClick(cert)}
                          >
                            <LuPencil /> Editar
                          </Button>
                          {cert.isValidated && (
                            <Button
                              size="sm"
                              variant="outline"
                              colorPalette="red"
                              onClick={() => handleDelete(cert.id)}
                            >
                              <LuBan /> Anular
                            </Button>
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
