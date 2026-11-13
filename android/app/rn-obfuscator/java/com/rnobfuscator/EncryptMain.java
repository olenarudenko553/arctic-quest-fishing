package com.rnobfuscator;

import java.io.IOException;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.objectweb.asm.ClassReader;
import org.objectweb.asm.ClassWriter;
import org.objectweb.asm.Opcodes;
import org.objectweb.asm.tree.AbstractInsnNode;
import org.objectweb.asm.tree.AnnotationNode;
import org.objectweb.asm.tree.ClassNode;
import org.objectweb.asm.tree.LdcInsnNode;
import org.objectweb.asm.tree.LookupSwitchInsnNode;
import org.objectweb.asm.tree.MethodInsnNode;
import org.objectweb.asm.tree.MethodNode;
import org.objectweb.asm.tree.TableSwitchInsnNode;

/**
 * Encrypts string literals in app class files and wraps them with Str.de.
 * Skips bridge contracts, manifest entry classes, and methods that switch on strings.
 */
public final class EncryptMain {
    private EncryptMain() {}

    public static void main(String[] args) throws Exception {
        if (args.length < 5) {
            throw new IllegalArgumentException(
                "usage: EncryptMain <reserved.txt> <android.jar> <classpath.txt> <hashes.txt> <classesDir>..."
            );
        }
        Path reservedFile = Path.of(args[0]);
        Path androidJar = Path.of(args[1]);
        Path classpathFile = Path.of(args[2]);
        Path hashFile = Path.of(args[3]);
        Loaded loaded = loadReserved(reservedFile);
        ClassLoader loader = classLoader(classpathFile, androidJar);
        Map<String, String> hashes = loadHashes(hashFile);
        int classes = 0;
        int strings = 0;
        int skipped = 0;
        for (int i = 4; i < args.length; i++) {
            Path dir = Path.of(args[i]);
            if (!Files.isDirectory(dir)) continue;
            try (var stream = Files.walk(dir)) {
                for (Path classFile : stream.filter(path -> path.toString().endsWith(".class")).toList()) {
                    try {
                        String key = classFile.toAbsolutePath().normalize().toString();
                        byte[] original = Files.readAllBytes(classFile);
                        String before = sha256(original);
                        if (before.equals(hashes.get(key))) continue;
                        int count = rewriteBytes(classFile, original, loaded, loader);
                        if (count > 0) {
                            classes++;
                            strings += count;
                            hashes.put(key, sha256(Files.readAllBytes(classFile)));
                        }
                    } catch (Throwable error) {
                        skipped++;
                        System.err.println("rn-obfuscator skip " + classFile + ": " + error.getMessage());
                    }
                }
            }
        }
        saveHashes(hashFile, hashes);
        System.out.println(
            "rn-obfuscator encrypted " + strings + " strings in " + classes + " classes, skipped " + skipped
        );
    }

    private static int rewriteBytes(Path classFile, byte[] original, Loaded loaded, ClassLoader loader) throws IOException {
        ClassReader reader = new ClassReader(original);
        ClassNode node = new ClassNode();
        reader.accept(node, ClassReader.SKIP_FRAMES);
        if (skipClass(node.name)) return 0;
        int count = 0;
        for (MethodNode method : node.methods) {
            if (skipMethod(method)) continue;
            AbstractInsnNode insn = method.instructions.getFirst();
            while (insn != null) {
                AbstractInsnNode next = insn.getNext();
                if (insn instanceof LdcInsnNode ldc && ldc.cst instanceof String value && shouldEncrypt(value, loaded.reserved)) {
                    ldc.cst = encrypt(value, loaded.key);
                    method.instructions.insert(
                        ldc,
                        new MethodInsnNode(
                            Opcodes.INVOKESTATIC,
                            "com/rnobfuscator/Str",
                            "de",
                            "(Ljava/lang/String;)Ljava/lang/String;",
                            false
                        )
                    );
                    count++;
                }
                insn = next;
            }
        }
        if (count == 0) return 0;
        ClassWriter writer = new HierarchyWriter(ClassWriter.COMPUTE_FRAMES, loader);
        node.accept(writer);
        Files.write(classFile, writer.toByteArray());
        return count;
    }

    private static boolean skipClass(String internalName) {
        if (internalName == null) return true;
        if (internalName.equals("com/rnobfuscator/Str")) return true;
        if (internalName.endsWith("/MainActivity")) return true;
        if (internalName.endsWith("/MainApplication")) return true;
        if (internalName.endsWith("/BuildConfig")) return true;
        if (internalName.endsWith("/R") || internalName.contains("/R$")) return true;
        return false;
    }

    private static boolean skipMethod(MethodNode method) {
        if (method.name.equals("getName") || method.name.equals("<clinit>")) return true;
        if (hasReactMethod(method.visibleAnnotations) || hasReactMethod(method.invisibleAnnotations)) return true;
        for (AbstractInsnNode insn = method.instructions.getFirst(); insn != null; insn = insn.getNext()) {
            if (insn instanceof TableSwitchInsnNode || insn instanceof LookupSwitchInsnNode) return true;
        }
        return false;
    }

    private static boolean hasReactMethod(List<AnnotationNode> annotations) {
        if (annotations == null) return false;
        for (AnnotationNode annotation : annotations) {
            if (annotation.desc != null && annotation.desc.contains("ReactMethod")) return true;
        }
        return false;
    }

    private static boolean shouldEncrypt(String value, Set<String> reserved) {
        if (value == null || value.isEmpty() || value.length() > 8000) return false;
        if (reserved.contains(value)) return false;
        return true;
    }

    static String encrypt(String value, byte[] key) {
        byte[] data = value.getBytes(StandardCharsets.UTF_8);
        for (int i = 0; i < data.length; i++) {
            data[i] = (byte) (data[i] ^ key[i % key.length]);
        }
        return Base64.getEncoder().encodeToString(data);
    }

    private static Loaded loadReserved(Path file) throws IOException {
        String keyHex = null;
        Set<String> reserved = new HashSet<>();
        for (String line : Files.readAllLines(file, StandardCharsets.UTF_8)) {
            if (line.startsWith("key:")) keyHex = line.substring(4).trim();
            else if (!line.isEmpty()) reserved.add(line);
        }
        if (keyHex == null || keyHex.length() != 32) {
            throw new IllegalArgumentException("reserved file is missing a 16-byte key");
        }
        return new Loaded(hexToBytes(keyHex), reserved);
    }

    private static String sha256(byte[] data) throws IOException {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(data);
            StringBuilder builder = new StringBuilder(digest.length * 2);
            for (byte item : digest) {
                builder.append(String.format("%02x", item));
            }
            return builder.toString();
        } catch (Exception error) {
            throw new IOException(error);
        }
    }

    private static Map<String, String> loadHashes(Path file) throws IOException {
        Map<String, String> hashes = new HashMap<>();
        if (!Files.isRegularFile(file)) return hashes;
        for (String line : Files.readAllLines(file, StandardCharsets.UTF_8)) {
            int split = line.indexOf('\t');
            if (split <= 0) continue;
            hashes.put(line.substring(0, split), line.substring(split + 1));
        }
        return hashes;
    }

    private static void saveHashes(Path file, Map<String, String> hashes) throws IOException {
        if (file.getParent() != null) Files.createDirectories(file.getParent());
        List<String> lines = new ArrayList<>();
        for (Map.Entry<String, String> entry : hashes.entrySet()) {
            lines.add(entry.getKey() + "\t" + entry.getValue());
        }
        Files.write(file, lines, StandardCharsets.UTF_8);
    }

    private static byte[] hexToBytes(String hex) {
        byte[] out = new byte[hex.length() / 2];
        for (int i = 0; i < out.length; i++) {
            out[i] = (byte) Integer.parseInt(hex.substring(i * 2, i * 2 + 2), 16);
        }
        return out;
    }

    private static ClassLoader classLoader(Path classpathFile, Path androidJar) throws IOException {
        List<URL> urls = new ArrayList<>();
        urls.add(androidJar.toUri().toURL());
        for (String line : Files.readAllLines(classpathFile, StandardCharsets.UTF_8)) {
            if (line.isBlank()) continue;
            urls.add(Path.of(line.trim()).toUri().toURL());
        }
        return new URLClassLoader(urls.toArray(URL[]::new), ClassLoader.getPlatformClassLoader());
    }

    private record Loaded(byte[] key, Set<String> reserved) {}

    private static final class HierarchyWriter extends ClassWriter {
        private final ClassLoader loader;

        HierarchyWriter(int flags, ClassLoader loader) {
            super(flags);
            this.loader = loader;
        }

        @Override
        protected String getCommonSuperClass(String type1, String type2) {
            try {
                Class<?> first = Class.forName(type1.replace('/', '.'), false, loader);
                Class<?> second = Class.forName(type2.replace('/', '.'), false, loader);
                if (first.isAssignableFrom(second)) return type1;
                if (second.isAssignableFrom(first)) return type2;
                if (first.isInterface() || second.isInterface()) return "java/lang/Object";
                do {
                    first = first.getSuperclass();
                } while (first != null && !first.isAssignableFrom(second));
                if (first == null) return "java/lang/Object";
                return first.getName().replace('.', '/');
            } catch (Throwable ignored) {
                return "java/lang/Object";
            }
        }
    }
}
