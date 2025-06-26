import bcrypt from "bcrypt";

const generateHash = async (password) => {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  console.log(`Senha/Chave original: ${password}`);
  console.log(`Hash gerado: ${hashedPassword}`);
};

// Gerar hash para uma senha de usuário
generateHash("123456");

// Gerar hash para uma chave de acesso
generateHash("123456");
