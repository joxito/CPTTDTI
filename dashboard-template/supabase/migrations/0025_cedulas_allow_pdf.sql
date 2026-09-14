-- El formulario de Solicitud de Servicios permite subir un PDF en vez de
-- las dos fotos de cédula (ver service-request.tsx), pero el bucket
-- "cedulas" solo aceptaba MIME types de imagen. La subida del PDF fallaba
-- en silencio (uploadIdPhotos no bloquea el envío si falla) y el archivo
-- nunca quedaba guardado, mostrando "—" en el detalle del servicio.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
where id = 'cedulas';
