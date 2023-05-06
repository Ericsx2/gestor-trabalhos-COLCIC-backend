import { Request, Response } from 'express';
import { prismaClient } from '../database/prismaClient';
import { generate } from 'generate-password';
import { hashSync, genSaltSync } from 'bcrypt';
import { IMailOptions, transporter } from '../modules/SendEmailModule';
require('dotenv').config();

class StudentController {
  async index(_: Request, response: Response) {
    const students = await prismaClient.student.findMany({
      where: {
        deleted: false,
      },
    });

    return response.send(students);
  }

  async store(request: Request, response: Response) {
    const { name, last_name, registration, email } = request.body;

    const nameAlreadyExists = await prismaClient.student.findFirst({
      where: {
        name,
      },
    });

    if (nameAlreadyExists) {
      return response.status(302).send({ message: 'Nome já existente!' });
    }

    const emailAlreadyExists = await prismaClient.user.findFirst({
      where: {
        email,
      },
    });

    if (emailAlreadyExists) {
      return response.status(302).send({ message: 'Email já existente!' });
    }

    const salt = genSaltSync(10);
    const generatedPassword = generate({
      length: 10,
      numbers: true,
      symbols: true,
    });
    const hashedPassword = hashSync(generatedPassword, salt);

    const user = await prismaClient.user.create({
      data: {
          email,
          role: 2,
          password: hashedPassword,
      }
    });

    const student = await prismaClient.student.create({
      data: {
        name,
        last_name,
        registration,
        userId: user.id
      },
    });

    const mailOptions: IMailOptions = {
      to: email,
      from: `Recovery Password <${process.env.SMTP_USER}>`,
      subject: 'Recovery Password',
      text: `Olá ${name}, essa é a sua senha temporária ${hashedPassword}, para alterar entre no link`,
      template: 'recuperar_senha',
      context: {
        subject: 'Recovery Password',
        name,
        link: 'https://www.youtube.com/watch?v=5-qbpf17lz8&t=12s',
        password: hashedPassword,
      },
    }

    await transporter.sendMail(mailOptions).catch((error) => {
      if (error) {
        return response
          .status(500)
          .send({ message: 'Erro ao enviar email', error });
      }
    });


    return response.send({ message: 'Usuário criado com sucesso' });
  }

  async show(request: Request, response: Response) {
    const { id } = request.params;
    const student = await prismaClient.student.findFirst({
      where: {
        id,
      },
      include: {
        projects: true,
      },
    });

    if (!student) {
      return response.status(404).send({ message: 'Usuário não encontrado' });
    }

    return response.send({
      id: student.id,
      name: student.name,
      last_name: student.last_name,
      projects: student.projects,

    });
  }

  async update(request: Request, response: Response) {
    const { id } = request.params;
    const { name, last_name, registration, email } = request.body;


    const student = await prismaClient.student.findFirst({
      where: {
        id,
      },
    });

    if (!student) {
      return response.status(404).send({ message: 'Usuário não encontrado' });
    }

    const studentUpdated = await prismaClient.student.update({
      data: {
        name,
        last_name,
        registration,
      },
      where: {
        id,
      },
    });

    return response.send({ message: 'usuário alterado com sucesso' });
  }

  async delete(request: Request, response: Response) {
    const { id } = request.params;

    const deletedStudent = await prismaClient.student.update({
      data: {
        deleted: true,
      },
      where: {
        id,
      },
    });

    return response.send({ message: 'usuário deletado com sucesso' });
  }
}

export { StudentController };
