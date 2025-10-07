// Script para actualizar el campo oficina_id del usuario admin si está en null
import { Usuario } from '../models/index.js';

async function fixAdminOficina() {
  try {
    const admin = await Usuario.findOne({ where: { username: 'admin' } });
    if (!admin) {
      console.log('Usuario admin no encontrado');
      return;
    }
    if (!admin.oficina_id) {
      admin.oficina_id = 1; // Puedes cambiar el valor según tu oficina
      await admin.save();
      console.log('oficina_id del usuario admin actualizado a 1');
    } else {
      console.log('El usuario admin ya tiene oficina_id:', admin.oficina_id);
    }
  } catch (err) {
    console.error('Error actualizando oficina_id:', err);
  }
}

fixAdminOficina();
